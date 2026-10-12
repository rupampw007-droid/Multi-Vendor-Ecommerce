import prisma from '@repo/lib/prisma/prisma';

export const updateUserAnalytics = async (event: any) => {
  try {
    const existingData = await prisma.userAnalytics.findUnique({
      where: {
        userId: event.userId,
      },
    });

    let updatedActions: any = existingData?.actions || [];

    const actionExists = updatedActions.some(
      (entry: any) =>
        entry.productId === event.productId && event.action === event.action,
    );

    // Always store 'product view' for recommendation
    if (event.action === 'product_view') {
      updatedActions.push({
        productId: event?.productId,
        shopId: event.shopId,
        action: 'product_view',
        timestamp: new Date(),
      });
    } else if (
      ['add_to_cart', 'add_to_wishlist'].includes(event.action) &&
      !actionExists
    ) {
      updatedActions.push({
        productId: event?.productId,
        shopId: event.shopId,
        action: event?.action,
        timestamp: new Date(),
      });
    } else if (event.action === 'remove_from_cart') {
      updatedActions = updatedActions.filter(
        (entry: any) =>
          !(
            entry.productId === event.productId &&
            entry.action === 'add_to_cart'
          ),
      );
    } else if (event.action === 'remove_from_wishlist') {
      updatedActions = updatedActions.filter(
        (entry: any) =>
          !(
            entry.productId === event.productId &&
            entry.action === 'add_to_wishlist'
          ),
      );
    }

    // keep only the last 100 actions (prevent storage overload)
    if (updatedActions.length > 100) {
      updatedActions.shift();
    }

    const extraFields: Record<string, any> = {};

    if (event.country) {
      extraFields.country = event.country;
    }
    if (event.city) {
      extraFields.city = event.city;
    }
    if (event.device) {
      extraFields.device = event.device;
    }

    // update or create user analytics
    await prisma.userAnalytics.upsert({
      where: { userId: event.userId },
      update: {
        lastVisited: new Date(),
        actions: updatedActions,
        ...extraFields,
      },
      create: {
        userId: event?.userId,
        lastVisited: new Date(),
        actions: updatedActions,
        ...extraFields,
      },
    });

    // Also update product analytics
    await updateProductAnalytics(event);
  } catch (error) {
    console.log('Error storing user analytics: ', error);
  }
};

export const updateProductAnalytics = async (event: any) => {
  try {
    if (!event.productId) return;

    // Defince update fields dynamically
    const updateFields: any = {};

    if (event.action === 'product_view') updateFields.views = { increment: 1 };
    if (event.action === 'add_to_cart')
      updateFields.cartAds = { increment: 1 };
    if (event.action === 'remove_from_cart')
      updateFields.cartAds = { decrement: 1 };
    if (event.action === 'add_to_wishlist')
      updateFields.wishlistAds = { increment: 1 };
    if (event.action === 'remove_from_wishlist')
      updateFields.wishlistAds = { decrement: 1 };
    if (event.action === 'purchase') updateFields.purchases = { increment: 1 };

    // update or create product analytics 
    await prisma.productAnalytics.upsert({
        where: { productId: event.productId },
        update: {
            lastViewedAt: new Date(),
            ...updateFields
        },
        create: {
            productId: event.productId,
            shopId: event.shopId || null,
            views: event.action === 'product_view' ? 1 : 0,
            cartAds: event.action === 'add_to_cart' ? 1 : 0,
            wishlistAds: event.action === 'add_to_wishlist' ? 1 : 0,
            purchases: event.action === 'purchase' ? 1 : 0,
            lastViewedAt: new Date()
        }
    })
  } catch (error) {
    console.log("Error in product analytics: ", error)
  }
};
