import axios from 'axios';

describe('notification service', () => {
  it('reports its service identity', async () => {
    const response = await axios.get('/');

    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      message: 'Welcome to notification-service!',
    });
  });

  it.each([
    '/api/user/notifications',
    '/api/seller/notifications',
    '/api/admin/notifications',
  ])('requires authentication for %s', async (path) => {
    const response = await axios.get(path, {
      validateStatus: () => true,
    });

    expect(response.status).toBe(401);
    expect(response.data).toEqual({
      message: 'Unauthorized! Token missing.',
    });
  });
});
