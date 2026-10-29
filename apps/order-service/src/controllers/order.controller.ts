import { randomUUID } from 'node:crypto';
import { NotFoundError, ValidationError } from '@repo/error-handler';
import prisma from '@repo/lib/prisma/prisma';
import redis from '@repo/lib/redis';
import { NextFunction, Request, Response } from 'express';
import Stripe from 'stripe';
import { sendEmail } from '../utils/send-email';
import { Prisma } from '@multivendor-ecommerce/generated/prisma/client';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY must be configured');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2026-08-26.dahlia',
});

type StripeConnectedAccount = Stripe.Account | Stripe.V2.Core.Account;

const retrieveStripeAccount = async (
  accountId: string,
): Promise<StripeConnectedAccount> => {
  try {
    return await stripe.v2.core.accounts.retrieve(accountId, {
      include: ['configuration.recipient', 'identity'],
    });
  } catch (error) {
    if (
      !(error instanceof Stripe.errors.StripeError) ||
      (error.statusCode !== 404 && error.code !== 'resource_missing')
    ) {
      throw error;
    }

    return stripe.accounts.retrieve(accountId);
  }
};

const canReceiveOrderPayouts = (account: StripeConnectedAccount) => {
  if (account.object === 'v2.core.account') {
    const capabilities =
      account.configuration?.recipient?.capabilities?.stripe_balance;
    return (
      account.closed !== true &&
      account.identity?.country === 'IN' &&
      capabilities?.stripe_transfers?.status === 'active' &&
      capabilities.payouts?.status === 'active'
    );
  }

  return (
    !('deleted' in account && account.deleted) &&
    account.country === 'IN' &&
    account.capabilities?.transfers === 'active' &&
    account.payouts_enabled
  );
};

type AuthenticatedRequest = Request & {
  user?: { id: string };
};

type SellerAuthenticatedRequest = Request & {
  seller?: { id: string };
};

type CartInput = {
  id: string;
  quantity: number;
  selectedOptions?: Record<string, string>;
};

type PaymentSession = {
  userId: string;
  cart: Array<{
    id: string;
    title: string;
    quantity: number;
    sale_price: number;
    shopId: string;
    selectedOptions: Record<string, string>;
  }>;
  sellers: Array<{
    shopId: string;
    sellerId: string;
    stripeAccountId: string;
    totalAmount: number;
  }>;
  subtotalAmount: number;
  totalAmount: number;
  discountAmount: number;
  shippingAddressId: string;
};

const getPaymentSession = async (
  sessionId: string,
): Promise<PaymentSession | null> => {
  const rawSession = await redis.get(`payment-session:${sessionId}`);
  return rawSession ? (JSON.parse(rawSession) as PaymentSession) : null;
};

export const createPaymentIntent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { sessionId } = req.body as { sessionId?: string };
    const userId = req.user?.id;

    if (!sessionId || !userId) {
      throw new ValidationError('A payment session is required');
    }

    const session = await getPaymentSession(sessionId);
    if (!session || session.userId !== userId) {
      throw new ValidationError('Payment session is invalid or expired');
    }

    const amount = Math.round(session.totalAmount * 100);
    if (!Number.isSafeInteger(amount) || amount < 50) {
      throw new ValidationError('Order total is not a valid payment amount');
    }

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount,
        currency: 'inr',
        payment_method_types: ['card'],
        transfer_group: sessionId,
        metadata: { sessionId, userId },
      },
      { idempotencyKey: `payment-session-${sessionId}` },
    );

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      subtotalAmount: session.subtotalAmount,
      discountAmount: session.discountAmount,
      totalAmount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      items: session.cart.map(({ id, title, quantity, sale_price }) => ({
        id,
        title,
        quantity,
        sale_price,
      })),
    });
  } catch (error) {
    return next(error);
  }
};

export const verifyingPaymentSession = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const paymentIntentId = req.query.paymentIntentId;
    const userId = req.user?.id;

    if (!userId || typeof paymentIntentId !== 'string' || !paymentIntentId) {
      throw new ValidationError('A payment intent is required');
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (
      paymentIntent.metadata.userId !== userId ||
      !paymentIntent.metadata.sessionId
    ) {
      throw new ValidationError('Payment intent does not belong to this user');
    }

    const order = await prisma.orders.findFirst({
      where: { paymentIntentId: paymentIntent.id, userId },
      select: { id: true },
    });

    return res.status(200).json({
      paymentStatus: paymentIntent.status,
      paid: paymentIntent.status === 'succeeded',
      orderId: order?.id ?? null,
    });
  } catch (error) {
    return next(error);
  }
};

export const createPaymentSession = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { cart, selectedAddressId, coupon } = req.body as {
      cart?: CartInput[];
      selectedAddressId?: string;
      coupon?: string | null;
    };
    const userId = req.user?.id;

    if (!userId || !Array.isArray(cart) || cart.length === 0) {
      throw new ValidationError('Cart is empty or invalid');
    }
    if (
      cart.some(
        (item) =>
          !item ||
          typeof item.id !== 'string' ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          (item.selectedOptions !== undefined &&
            (typeof item.selectedOptions !== 'object' ||
              item.selectedOptions === null ||
              Array.isArray(item.selectedOptions))),
      )
    ) {
      throw new ValidationError('Cart contains an invalid item');
    }
    if (!selectedAddressId) {
      throw new ValidationError('A shipping address is required');
    }

    const address = await prisma.userAddress.findFirst({
      where: { id: selectedAddressId, userId },
      select: { id: true },
    });
    if (!address) {
      throw new ValidationError('Shipping address was not found');
    }

    const productIds = [...new Set(cart.map((item) => item.id))];
    const products = await prisma.products.findMany({
      where: {
        id: { in: productIds },
        isDeleted: false,
        status: 'Active',
      },
      select: {
        id: true,
        title: true,
        sale_price: true,
        stock: true,
        shopId: true,
      },
    });
    if (products.length !== productIds.length) {
      throw new ValidationError('One or more products are unavailable');
    }

    const productById = new Map(products.map((product) => [product.id, product]));
    const normalizedCart = cart.map((item) => {
      const product = productById.get(item.id);
      if (!product || product.stock < item.quantity) {
        throw new ValidationError(
          `Insufficient stock for ${product?.title ?? 'a cart item'}`,
        );
      }
      return {
        id: product.id,
        title: product.title,
        quantity: item.quantity,
        sale_price: product.sale_price,
        shopId: product.shopId,
        selectedOptions: item.selectedOptions ?? {},
      };
    });

    const shopIds = [...new Set(normalizedCart.map((item) => item.shopId))];
    const shops = await prisma.shops.findMany({
      where: { id: { in: shopIds } },
      select: {
        id: true,
        sellerId: true,
        sellers: { select: { stripeId: true } },
      },
    });
    if (shops.length !== shopIds.length) {
      throw new ValidationError('One or more sellers are unavailable');
    }

    const sellers = shops.map((shop) => {
      if (!shop.sellers.stripeId) {
        throw new ValidationError(
          'A seller has not connected a payout account yet. Please contact the seller or try another product.',
        );
      }
      const sellerItems = normalizedCart.filter(
        (item) => item.shopId === shop.id,
      );
      return {
        shopId: shop.id,
        sellerId: shop.sellerId,
        stripeAccountId: shop.sellers.stripeId,
        totalAmount: sellerItems.reduce(
          (total, item) => total + item.quantity * item.sale_price,
          0,
        ),
      };
    });
    const sellerAccounts = await Promise.all(
      sellers.map((seller) => retrieveStripeAccount(seller.stripeAccountId)),
    );
    if (sellerAccounts.some((account) => !canReceiveOrderPayouts(account))) {
      throw new ValidationError(
        'A seller has not completed Stripe payout setup. Please contact the seller or try another product.',
      );
    }
    const subtotalAmount = normalizedCart.reduce(
      (total, item) => total + item.quantity * item.sale_price,
      0,
    );
    if (!Number.isFinite(subtotalAmount) || subtotalAmount <= 0) {
      throw new ValidationError('Order total is not a valid payment amount');
    }
    const normalizedCoupon = coupon?.trim().toUpperCase();
    if (normalizedCoupon && !['SAVE10', 'FLAT100'].includes(normalizedCoupon)) {
      throw new ValidationError('Coupon code is invalid');
    }
    const discountAmount =
      normalizedCoupon === 'SAVE10'
        ? Math.min(Math.round(subtotalAmount * 0.1), subtotalAmount)
        : normalizedCoupon === 'FLAT100'
          ? Math.min(100, subtotalAmount)
          : 0;
    const subtotalInMinorUnits = Math.round(subtotalAmount * 100);
    const totalInMinorUnits =
      subtotalInMinorUnits - Math.round(discountAmount * 100);
    let remainingSellerAmount = totalInMinorUnits;
    const discountedSellers = sellers.map((seller, index) => {
      const sellerAmount =
        index === sellers.length - 1
          ? remainingSellerAmount
          : Math.floor(
              (totalInMinorUnits * Math.round(seller.totalAmount * 100)) /
                subtotalInMinorUnits,
            );
      remainingSellerAmount -= sellerAmount;
      return { ...seller, totalAmount: sellerAmount / 100 };
    });
    const totalAmount = totalInMinorUnits / 100;
    const sessionId = randomUUID();
    const session: PaymentSession = {
      userId,
      cart: normalizedCart,
      sellers: discountedSellers,
      subtotalAmount,
      totalAmount,
      discountAmount,
      shippingAddressId: selectedAddressId,
    };

    await redis.setex(
      `payment-session:${sessionId}`,
      600,
      JSON.stringify(session),
    );

    return res.status(201).json({
      sessionId,
      subtotalAmount,
      discountAmount,
      totalAmount,
      currency: 'inr',
    });
  } catch (error) {
    return next(error);
  }
};

export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret || !Buffer.isBuffer(req.body)) {
    return res.status(400).send('Invalid Stripe webhook request');
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid signature';
    return res.status(400).send(`Webhook error: ${message}`);
  }

  if (event.type !== 'payment_intent.succeeded') {
    return res.sendStatus(200);
  }

  try {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const { sessionId, userId } = paymentIntent.metadata;
    if (!sessionId || !userId) {
      throw new ValidationError('Payment intent is missing order metadata');
    }

    const existingOrder = await prisma.orders.findUnique({
      where: { paymentIntentId: paymentIntent.id },
      select: { id: true },
    });
    if (existingOrder) {
      return res.status(200).json({ received: true });
    }

    const sessionKey = `payment-session:${sessionId}`;
    const session = await getPaymentSession(sessionId);
    if (!session) {
      return res.status(200).send('Payment session expired; order was not processed');
    }
    if (session.userId !== userId) {
      throw new ValidationError('Payment intent does not match the order owner');
    }

    const transferGroup = paymentIntent.transfer_group ?? sessionId;
    for (const seller of session.sellers) {
      const sellerAmount = Math.round(seller.totalAmount * 100);
      const platformFee = Math.floor(sellerAmount * 0.1);
      const transferAmount = sellerAmount - platformFee;
      if (transferAmount > 0) {
        await stripe.transfers.create(
          {
            amount: transferAmount,
            currency: paymentIntent.currency,
            destination: seller.stripeAccountId,
            transfer_group: transferGroup,
          },
          {
            idempotencyKey: `order-${paymentIntent.id}-${seller.sellerId}`,
          },
        );
      }
    }

    const address = await prisma.userAddress.findFirst({
      where: { id: session.shippingAddressId, userId },
    });
    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ValidationError('Order customer was not found');
    }

    const order = await prisma.$transaction(async (transaction) => {
      const createdOrder = await transaction.orders.create({
        data: {
          paymentIntentId: paymentIntent.id,
          userId,
          shopIds: [...new Set(session.cart.map((item) => item.shopId))],
          items: session.cart,
          shippingAddress: address
            ? {
                label: address.label,
                name: address.name,
                street: address.street,
                city: address.city,
                state: address.state,
                zip: address.zip,
                country: address.country,
                phone: address.phone,
              }
            : undefined,
          subtotal: session.subtotalAmount,
          totalAmount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
        },
      });

      for (const item of session.cart) {
        const stockUpdate = await transaction.products.updateMany({
          where: { id: item.id, stock: { gte: item.quantity } },
          data: {
            stock: { decrement: item.quantity },
            totalSales: { increment: item.quantity },
          },
        });
        if (stockUpdate.count !== 1) {
          throw new ValidationError(
            `Insufficient stock for ${item.title} when payment completed`,
          );
        }

        await transaction.productAnalytics.upsert({
          where: { productId: item.id },
          create: {
            productId: item.id,
            shopId: item.shopId,
            purchases: item.quantity,
            lastViewedAt: new Date(),
          },
          update: { purchases: { increment: item.quantity } },
        });
      }

      for (const seller of session.sellers) {
        const sellerItems = session.cart.filter(
          (item) => item.shopId === seller.shopId,
        );
        const firstItem = sellerItems[0];
        await transaction.notifications.create({
          data: {
            title: 'New Order Received',
            message:
              sellerItems.length === 1
                ? `You received a new order for ${firstItem.title}.`
                : `You received a new order containing ${sellerItems.length} products.`,
            creatorId: userId,
            receiverId: seller.sellerId,
            orderId: createdOrder.id,
            redirect_link: `/dashboard/orders?paymentIntentId=${encodeURIComponent(paymentIntent.id)}`,
          },
        });
      }

      return createdOrder;
    });

    const deliveryLocation = address
      ? [
          address.street,
          address.city,
          address.state,
          address.zip,
          address.country,
        ]
          .filter(Boolean)
          .join(', ')
      : 'Shipping address';

    const emailSent = await sendEmail(
      user.email,
      'Order Confirmation',
      'order-confirmation',
      {
        name: user.name,
        orderId: order.id,
        totalAmount: (paymentIntent.amount / 100).toFixed(2),
        paymentMethod: 'Card',
        deliveryLocation,
        items: session.cart.map((item) => ({
          name: item.title,
          quantity: item.quantity,
          price: item.sale_price,
        })),
      },
    );
    if (!emailSent) {
      console.error(`Order confirmation email failed for ${paymentIntent.id}`);
    }

    await redis.del(sessionKey);
    return res.status(200).json({ received: true });
  } catch (error) {
    return next(error);
  }
};


// get seller orders
export const getSellerOrders = async (
  req: SellerAuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sellerId = req.seller?.id;
    if (!sellerId) {
      throw new ValidationError('Seller authentication is required');
    }

    const shop = await prisma.shops.findUnique({
      where: { sellerId },
    });
    if (!shop) {
      throw new ValidationError('Seller shop was not found');
    }

    const orders = await prisma.orders.findMany({
      where: {
        shopIds: { has: shop.id },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            id: true,
            avatars: {
              select: { url: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      orders: orders.map((order) => ({
        ...order,
        items: Array.isArray(order.items)
          ? order.items.filter(
              (item) =>
                item !== null &&
                typeof item === 'object' &&
                !Array.isArray(item) &&
                'shopId' in item &&
                item.shopId === shop.id,
            )
          : [],
      })),
    });
  } catch (error) {
    return next(error);
  }
};

export const getOrderDetails = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const orderId = req.params.id;
    const userId = req.user?.id;
    if (!userId) {
      throw new ValidationError('Customer authentication is required');
    }

    const order = await prisma.orders.findUnique({
      where: { id: orderId, userId },
    });

    if (!order) {
      return next(new NotFoundError('Order not found'));
    }

    const orderItems = Array.isArray(order.items)
      ? order.items.filter(
          (item): item is Prisma.JsonObject =>
            item !== null &&
            typeof item === 'object' &&
            !Array.isArray(item),
        )
      : [];
    const productIds = [
      ...new Set(
        orderItems.flatMap((item) =>
          typeof item.id === 'string' ? [item.id] : [],
        ),
      ),
    ];
    const products = await prisma.products.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        title: true,
        images: true,
      },
    });

    const productMap = new Map(
      products.map((product) => [product.id, product]),
    );
    const items = orderItems.map((item) => {
      const productId = typeof item.id === 'string' ? item.id : null;
      const selectedOptions = item.selectedOptions;

      return {
        ...item,
        selectedOptions:
          selectedOptions !== null &&
          typeof selectedOptions === 'object' &&
          !Array.isArray(selectedOptions)
            ? selectedOptions
            : {},
        product: productId ? productMap.get(productId) ?? null : null,
      };
    });

    res.status(200).json({
      success: true,
      order: {
        ...order,
        items,
        shippingAddress: order.shippingAddress,
      },
    });
  } catch (error) {
    return next(error);
  }
};