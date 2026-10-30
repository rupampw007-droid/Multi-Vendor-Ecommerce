import { Request, Response, NextFunction } from 'express';
import {
  checkOtpRestrictions,
  handleForgotPassword,
  sendOtp,
  trackOtpRequest,
  validateRegistrationData,
  verifyForgotPasswordOtp,
  verifyOtp,
} from '../utils/auth.helper';
import prisma from '@repo/lib/prisma/prisma';
import {
  AuthError,
  NotFoundError,
  ValidationError,
} from '@repo/error-handler';
import bcrypt from 'bcryptjs';
import jwt, { JsonWebTokenError } from 'jsonwebtoken';
import { setCookie } from '../utils/cookies/setCookie';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-08-26.dahlia',
});

// REGISTER A NEW USER

export const userRegestration = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    validateRegistrationData(req.body, 'user');
    const { name, email } = req.body;
    const normalizedEmail = String(email).trim().toLowerCase();

    const existingUser = await prisma.users.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ValidationError('User already exist with this email');
    }

    await checkOtpRestrictions(normalizedEmail);
    await trackOtpRequest(normalizedEmail);
    await sendOtp(name, normalizedEmail, 'user-activation-mail');

    return res.status(200).json({
      message: 'OTP sent to email. Please verify your account',
    });
  } catch (error) {
    return next(error);
  }
};

export const verifyUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, otp, password, name } = req.body;
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!normalizedEmail || !otp || !password || !name) {
      return next(new ValidationError('All fields are required!'));
    }
    const existingUser = await prisma.users.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return next(new ValidationError('User already exists with this email'));
    }

    await verifyOtp(normalizedEmail, otp);
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.users.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
      },
    });
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
    });
  } catch (err) {
    console.log(err);
    return next(err);
  }
};

export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email).trim().toLowerCase();

    if (!normalizedEmail || !password) {
      throw new ValidationError('Email and Password are required');
    }
    const user = await prisma.users.findUnique({
      where: { email: normalizedEmail },
    });
    if (!user) {
      throw new AuthError("User doesn't exist");
    }
    //verify password
    const isMatch = await bcrypt.compare(password, user.password!);
    if (!isMatch) {
      throw new AuthError('Invalid Email or Password');
    }

    res.clearCookie("seller-access-token")
    res.clearCookie("seller-refresh-token")

    // Generate access and refresh token
    const accessToken = jwt.sign(
      { id: user.id, role: 'user' },
      process.env.ACCESS_TOKEN_SECRET as string,
      { expiresIn: '15m' },
    );

    const refreshToken = jwt.sign(
      {
        id: user.id,
        role: 'user',
      },
      process.env.REFRESH_TOKEN_SECRET as string,
      {
        expiresIn: '7d',
      },
    );

    // Store the refresh and access token in an httpOnly secure cookie
    setCookie(res, 'refresh_token', refreshToken);
    setCookie(res, 'access_token', accessToken);

    res.status(200).json({
      message: 'Login Successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    return next(err);
  }
};

export const userForgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  await handleForgotPassword(req, res, next, 'user');
};

export const verifyUserForgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  await verifyForgotPasswordOtp(req, res, next);
};

// get logged in user
export const getUser = async (
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        avatars: {
          select: {
            id: true,
            url: true,
          },
        },
      },
    });
    if (!user) {
      throw new AuthError('User account not found');
    }
    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateUserProfile = async (
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const { name, email } = req.body ?? {};
    if (
      typeof name !== 'string' ||
      !name.trim() ||
      typeof email !== 'string' ||
      !email.trim()
    ) {
      throw new ValidationError('Name and email are required');
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new ValidationError('Enter a valid email address');
    }

    const existingUser = await prisma.users.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (existingUser && existingUser.id !== userId) {
      throw new ValidationError('Email is already in use');
    }

    const user = await prisma.users.update({
      where: { id: userId },
      data: { name: name.trim(), email: normalizedEmail },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        avatars: {
          select: {
            id: true,
            url: true,
          },
        },
      },
    });
    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    return next(error);
  }
};

export const changeUserPassword = async (
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const { currentPassword, newPassword } = req.body ?? {};

    if (
      typeof currentPassword !== 'string' ||
      !currentPassword ||
      typeof newPassword !== 'string' ||
      newPassword.length < 8
    ) {
      throw new ValidationError(
        'Current password and a new password of at least 8 characters are required',
      );
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });
    if (!user?.password) {
      throw new AuthError('Password authentication is unavailable for this account');
    }

    if (!(await bcrypt.compare(currentPassword, user.password))) {
      throw new AuthError('Current password is incorrect');
    }
    if (await bcrypt.compare(newPassword, user.password)) {
      throw new ValidationError(
        'New password cannot be the same as your current password',
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.users.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    return next(error);
  }
};

export const logoutUser = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    return next(error);
  }
};

export const refreshToken = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const requestedRole = req.body?.role;
    if (
      requestedRole !== undefined &&
      !['user', 'seller'].includes(requestedRole)
    ) {
      throw new JsonWebTokenError('Forbidden! Invalid account role');
    }

    const refreshToken =
      requestedRole === 'seller'
        ? req.cookies?.['seller-refresh-token']
        : requestedRole === 'user'
          ? req.cookies?.['refresh_token']
          : req.cookies?.['refresh_token'] ||
            req.cookies?.['seller-refresh-token'];

    if (!refreshToken) {
      throw new AuthError('Unauthorized! No refresh token');
    }
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET as string,
    ) as { id: string; role: string };

    if (
      !decoded.id ||
      !['user', 'seller'].includes(decoded.role) ||
      (requestedRole !== undefined && decoded.role !== requestedRole)
    ) {
      throw new JsonWebTokenError('Forbidden! Invalid refresh token');
    }

    let account;
    if (decoded.role === 'user') {
      account = await prisma.users.findUnique({
        where: { id: decoded.id },
      });
    } else {
      account = await prisma.sellers.findUnique({
        where: { id: decoded.id },
      });
    }

    if (!account) {
      throw new AuthError('Forbidden! User/Seller not found');
    }

    const newAccessToken = jwt.sign(
      {
        id: decoded.id,
        role: decoded.role,
      },
      process.env.ACCESS_TOKEN_SECRET as string,
      {
        expiresIn: '15m',
      },
    );

    if (decoded.role === 'user') {
      setCookie(res, 'access_token', newAccessToken);
    } else {
      setCookie(res, 'seller-access-token', newAccessToken);
    }
    req.role = decoded.role;
    return res.status(200).json({
      success: true,
    });
  } catch (err) {
    return next(err);
  }
};

export const resetUserPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, newPassword } = req.body;
    const normalizedEmail = String(email).trim().toLowerCase();

    if (!normalizedEmail || !newPassword) {
      throw new ValidationError('Email and New Password are required!');
    }
    const user = await prisma.users.findUnique({
      where: { email: normalizedEmail },
    });
    if (!user) return next(new ValidationError('User not found!'));

    //Compare new password with the existing one
    const isSamePassword = await bcrypt.compare(newPassword, user.password!);
    if (isSamePassword) {
      throw new ValidationError(
        'New password cannot be the same as old password',
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.users.update({
      where: { email: user.email },
      data: { password: hashedPassword },
    });
    res.status(200).json({
      message: 'Password reset successfully!',
    });
  } catch (err) {
    next(err);
  }
};

// register a new seller
export const registerSeller = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    validateRegistrationData(req.body, 'seller');
    const { name, email } = req.body;

    const existingSeller = await prisma.sellers.findUnique({
      where: { email },
    });
    if (existingSeller) {
      throw new ValidationError('Seller already exists with this email');
    }
    await checkOtpRestrictions(email);
    await trackOtpRequest(email);
    await sendOtp(name, email, 'seller-activation');

    res.status(200).json({
      message: 'Otp sent to your email, please verify your account',
    });
  } catch (error) {
    next(error);
  }
};

// verify seller with otp
export const verifySeller = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, otp, password, name, phone_number} = req.body;
    if (!email || !otp || !password || !name || !phone_number) {
      return next(new ValidationError('All fields are required'));
    }

    const existingSeller = await prisma.sellers.findUnique({
      where: { email },
    });

    if (existingSeller) {
      return next(new ValidationError('Seller already exists with this email'));
    }

    await verifyOtp(email, otp);
    const hashedPassword = await bcrypt.hash(password, 10);

    const seller = await prisma.sellers.create({
      data: {
        name,
        email,
        password: hashedPassword,
        country: "India",
        phone_number,
      },
    });
    res
      .status(201)
      .json({ seller, message: 'Seller registered successfully!' });
  } catch (error) {
    next(error);
  }
};

// create a new shop
export const createShop = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, bio, address, opening_hours, website, category, sellerId } =
      req.body;

    if (
      !name ||
      !bio ||
      !address ||
      !opening_hours ||
      !website ||
      !category ||
      !sellerId
    ) {
      return next(new ValidationError('All fields are required'));
    }

    const shopData = {
      name,
      bio,
      address,
      opening_hours,
      category,
      sellerId,
      website,
    };

    if (website && website.trim() !== '') {
      shopData.website = website;
    }

    const shop = await prisma.shops.create({
      data: shopData,
    });

    res.status(201).json({
      success: true,
      shop,
    });
  } catch (error) {
    next(error);
  }
};

type AuthenticatedSellerRequest = Request & {
  seller?: {
    id: string;
    email: string;
    stripeId: string | null;
  };
};

type StripeConnectedAccount = Stripe.Account | Stripe.V2.Core.Account;

const isV2StripeAccount = (
  account: StripeConnectedAccount,
): account is Stripe.V2.Core.Account =>
  account.object === 'v2.core.account';

const retrieveStripeAccount = async (
  accountId: string,
): Promise<StripeConnectedAccount> => {
  try {
    return await stripe.v2.core.accounts.retrieve(accountId, {
      include: ['configuration.recipient', 'identity', 'requirements'],
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

const isUnavailableStripeAccount = (account: StripeConnectedAccount) =>
  isV2StripeAccount(account)
    ? account.closed === true
    : 'deleted' in account && account.deleted;

const getStripeAccountStatus = (account: StripeConnectedAccount) => {
  if (isV2StripeAccount(account)) {
    const recipient = account.configuration?.recipient;
    const capabilities = recipient?.capabilities?.stripe_balance;
    const requirements = account.requirements?.entries ?? [];
    const transfersEnabled =
      capabilities?.stripe_transfers?.status === 'active';
    const payoutsEnabled = capabilities?.payouts?.status === 'active';

    return {
      accountId: account.id,
      country: account.identity?.country ?? null,
      detailsSubmitted:
        account.identity != null &&
        requirements.every(
          (entry) => entry.minimum_deadline.status !== 'currently_due',
        ),
      chargesEnabled: false,
      payoutsEnabled,
      transfersEnabled,
      ready: transfersEnabled && payoutsEnabled,
      currentlyDue: requirements
        .filter((entry) =>
          ['currently_due', 'past_due'].includes(
            entry.minimum_deadline.status,
          ),
        )
        .map((entry) => entry.description),
      eventuallyDue: requirements
        .filter(
          (entry) => entry.minimum_deadline.status === 'eventually_due',
        )
        .map((entry) => entry.description),
      disabledReason: account.closed ? 'account_closed' : null,
    };
  }

  const transfersEnabled = account.capabilities?.transfers === 'active';
  const payoutsEnabled = account.payouts_enabled;
  const chargesEnabled = account.charges_enabled;
  const ready = transfersEnabled && payoutsEnabled;

  return {
    accountId: account.id,
    country: account.country,
    detailsSubmitted: account.details_submitted,
    chargesEnabled,
    payoutsEnabled,
    transfersEnabled,
    ready,
    currentlyDue: account.requirements?.currently_due ?? [],
    eventuallyDue: account.requirements?.eventually_due ?? [],
    disabledReason: account.requirements?.disabled_reason ?? null,
  };
};

const respondToStripeConnectError = (
  error: unknown,
  res: Response,
): boolean => {
  if (!(error instanceof Stripe.errors.StripeError)) {
    return false;
  }

  console.error('Stripe Connect onboarding request failed', {
    type: error.type,
    code: error.code,
    statusCode: error.statusCode,
    requestId: error.requestId,
    message: error.message,
  });

  res.status(502).json({
    status: 'error',
    message:
      'Stripe could not complete account setup. Check your Stripe Connect configuration and try again.',
    stripeErrorType: error.type,
    stripeErrorCode: error.code ?? null,
    stripeErrorMessage: error.message,
    stripeRequestId: error.requestId ?? null,
  });
  return true;
};

export const getStripeConnectStatus = async (
  req: AuthenticatedSellerRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const seller = req.seller;
    if (!seller) {
      throw new AuthError('Seller authentication is required');
    }

    if (!seller.stripeId) {
      return res.status(200).json({
        connected: false,
        ready: false,
        account: null,
      });
    }

    const account = await retrieveStripeAccount(seller.stripeId);
    if (isUnavailableStripeAccount(account)) {
      return res.status(200).json({
        connected: false,
        ready: false,
        account: null,
        message:
          'The linked Stripe account is no longer available. Please contact support.',
      });
    }

    const status = getStripeAccountStatus(account);
    return res.status(200).json({
      connected: true,
      ready: status.ready && status.country === 'IN',
      account: status,
    });
  } catch (error) {
    if (respondToStripeConnectError(error, res)) return;
    return next(error);
  }
};

export const createStripeConnectLink = async (
  req: AuthenticatedSellerRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const seller = req.seller;
    if (!seller) {
      throw new AuthError('Seller authentication is required');
    }

    let account: StripeConnectedAccount;
    if (seller.stripeId) {
      const existingAccount = await retrieveStripeAccount(seller.stripeId);
      if (isUnavailableStripeAccount(existingAccount)) {
        throw new ValidationError(
          'The linked Stripe account is no longer available. Please contact support.',
        );
      }
      account = existingAccount;
      const accountCountry = isV2StripeAccount(account)
        ? account.identity?.country
        : account.country;
      if (accountCountry !== 'IN') {
        throw new ValidationError(
          'This Stripe account is registered in a different country and cannot be changed. Please contact support to reconnect your payout account in India.',
        );
      }
    } else {
      account = await stripe.v2.core.accounts.create(
        {
          contact_email: seller.email,
          dashboard: 'express',
          identity: {
            country: 'IN',
          },
          configuration: {
            recipient: {
              capabilities: {
                stripe_balance: {
                  stripe_transfers: { requested: true },
                },
              },
            },
          },
          defaults: {
            currency: 'inr',
            responsibilities: {
              fees_collector: 'application',
              losses_collector: 'application',
            },
          },
          include: ['configuration.recipient', 'identity', 'requirements'],
        },
        { idempotencyKey: `seller-stripe-account-${seller.id}` },
      );

      await prisma.sellers.update({
        where: { id: seller.id },
        data: { stripeId: account.id },
      });
    }

    const configuredSellerUiUrl =
      process.env.SELLER_UI_URL ??
      (process.env.NODE_ENV === 'production'
        ? undefined
        : 'http://localhost:3001');
    if (!configuredSellerUiUrl) {
      throw new ValidationError(
        'SELLER_UI_URL must be configured for Stripe onboarding in production',
      );
    }
    const sellerUiUrl = configuredSellerUiUrl.replace(/\/+$/, '');
    const refreshUrl = `${sellerUiUrl}/dashboard/payments?refresh=true`;
    const returnUrl = `${sellerUiUrl}/dashboard/payments?connected=true`;
    const accountLink = isV2StripeAccount(account)
      ? await stripe.v2.core.accountLinks.create({
          account: account.id,
          use_case: {
            type: 'account_onboarding',
            account_onboarding: {
              configurations: ['recipient'],
              refresh_url: refreshUrl,
              return_url: returnUrl,
            },
          },
        })
      : await stripe.accountLinks.create({
          account: account.id,
          refresh_url: refreshUrl,
          return_url: returnUrl,
          type: 'account_onboarding',
        });

    return res.status(200).json({
      url: accountLink.url,
      account: getStripeAccountStatus(account),
    });
  } catch (error) {
    if (respondToStripeConnectError(error, res)) return;
    return next(error);
  }
};

//loginSeller
export const loginSeller = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return next(new ValidationError('Email and password are requried!'));

    const seller = await prisma.sellers.findUnique({ where: { email } });
    if (!seller) return next(new ValidationError('Invalid email or password!'));

    //verify password
    const isMatch = await bcrypt.compare(password, seller.password);
    if (!isMatch) {
      return next(new ValidationError('Invalid email or password'));
    }

    res.clearCookie("access_token")
    res.clearCookie("refresh_token")

    const accessToken = jwt.sign(
      {
        id: seller.id,
        role: 'seller',
      },
      process.env.ACCESS_TOKEN_SECRET as string,
      { expiresIn: '15m' },
    );

    const refreshToken = jwt.sign(
      {
        id: seller.id,
        role: 'seller',
      },
      process.env.REFRESH_TOKEN_SECRET as string,
      { expiresIn: '7d' },
    );

        // store refresh token
    setCookie(res, 'seller-refresh-token', refreshToken);
    setCookie(res, 'seller-access-token', accessToken);

    return res.status(200).json({
      message: 'Login Successful',
      user: {
        id: seller.id,
        email: seller.email,
        name: seller.name,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get logged in seller
export const getSeller = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const seller = req.seller;
    res.status(201).json({
      success: true,
      seller,
    });
  } catch (error) {
    next(error);
  }
};

type AuthenticatedUserRequest = Request & {
  user?: {
    id?: string;
  };
};

interface UserAddressInput {
  label: string;
  name: string;
  street: string;
  city: string;
  state?: string | null;
  zip: string;
  country: string;
  phone?: string | null;
  isDefault?: boolean;
}

const getAddressInput = (body: unknown): UserAddressInput => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Address details are required');
  }

  const values = body as Record<string, unknown>;
  const requiredFields = [
    'label',
    'name',
    'street',
    'city',
    'zip',
    'country',
  ] as const;
  const address: UserAddressInput = {
    label: '',
    name: '',
    street: '',
    city: '',
    zip: '',
    country: '',
  };

  for (const field of requiredFields) {
    const value = values[field];
    if (typeof value !== 'string' || !value.trim()) {
      throw new ValidationError(`${field} is required`);
    }
    address[field] = value.trim();
  }

  for (const field of ['state', 'phone'] as const) {
    const value = values[field];
    if (value !== undefined && value !== null && typeof value !== 'string') {
      throw new ValidationError(`${field} must be a string`);
    }
    address[field] =
      typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  if (values.isDefault !== undefined && typeof values.isDefault !== 'boolean') {
    throw new ValidationError('isDefault must be a boolean');
  }
  if (typeof values.isDefault === 'boolean') {
    address.isDefault = values.isDefault;
  }

  return address;
};

const getAuthenticatedUserId = (req: AuthenticatedUserRequest) => {
  if (!req.user?.id) {
    throw new AuthError('User authentication is required');
  }
  return req.user.id;
};

const validateAddressId = (id: string) => {
  if (!/^[a-f\d]{24}$/i.test(id)) {
    throw new ValidationError('A valid address ID is required');
  }
};

export const getUserAddresses = async (
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const addresses = await prisma.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return res.status(200).json({ success: true, addresses });
  } catch (error) {
    return next(error);
  }
};

export const addUserAddress = async (
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const address = getAddressInput(req.body);
    const addressCount = await prisma.userAddress.count({ where: { userId } });
    const isDefault = address.isDefault === true || addressCount === 0;

    if (isDefault) {
      await prisma.userAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const createdAddress = await prisma.userAddress.create({
      data: { ...address, isDefault, userId },
    });
    return res.status(201).json({
      success: true,
      message: 'Address added successfully',
      address: createdAddress,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateUserAddress = async (
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getAuthenticatedUserId(req);
    validateAddressId(req.params.id);
    const addressInput = getAddressInput(req.body);
    const existingAddress = await prisma.userAddress.findFirst({
      where: { id: req.params.id, userId },
    });

    if (!existingAddress) {
      throw new NotFoundError('Address not found');
    }

    const isDefault = addressInput.isDefault ?? existingAddress.isDefault;
    if (isDefault) {
      await prisma.userAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.userAddress.update({
      where: { id: existingAddress.id },
      data: { ...addressInput, isDefault },
    });
    return res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      address,
    });
  } catch (error) {
    return next(error);
  }
};

export const setDefaultUserAddress = async (
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getAuthenticatedUserId(req);
    validateAddressId(req.params.id);
    const address = await prisma.userAddress.findFirst({
      where: { id: req.params.id, userId },
    });

    if (!address) {
      throw new NotFoundError('Address not found');
    }

    await prisma.userAddress.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
    const updatedAddress = await prisma.userAddress.update({
      where: { id: address.id },
      data: { isDefault: true },
    });
    return res.status(200).json({
      success: true,
      message: 'Default address updated successfully',
      address: updatedAddress,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteUserAddress = async (
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getAuthenticatedUserId(req);
    validateAddressId(req.params.id);
    const address = await prisma.userAddress.findFirst({
      where: { id: req.params.id, userId },
    });

    if (!address) {
      throw new NotFoundError('Address not found');
    }

    await prisma.userAddress.delete({ where: { id: address.id } });

    if (address.isDefault) {
      const nextDefaultAddress = await prisma.userAddress.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });
      if (nextDefaultAddress) {
        await prisma.userAddress.update({
          where: { id: nextDefaultAddress.id },
          data: { isDefault: true },
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Address deleted successfully',
    });
  } catch (error) {
    return next(error);
  }
};