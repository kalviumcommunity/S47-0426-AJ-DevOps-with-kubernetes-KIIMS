import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

const verifyTokenMock = jest.fn();

jest.mock('../auth/auth.service', () => ({
  __esModule: true,
  createDefaultAuthService: () => ({
    verifyToken: verifyTokenMock,
  }),
}));

import { requireAuth } from './auth.middleware';

describe('requireAuth middleware', () => {
  beforeEach(() => {
    verifyTokenMock.mockReset();
  });

  it('rejects requests without a bearer token', async () => {
    const req = { header: jest.fn().mockReturnValue(undefined) } as unknown as Request;
    const res = {} as Response;
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = next.mock.calls[0][0] as AppError;
    expect(error.statusCode).toBe(401);
  });

  it('attaches the decoded payload for a valid token', async () => {
    const req = { header: jest.fn().mockReturnValue('Bearer access-token') } as unknown as Request;
    const res = {} as Response;
    const next = jest.fn();

    verifyTokenMock.mockResolvedValue({ patientId: 'abc', email: 'jane@example.com' });

    await requireAuth(req, res, next);

    expect(verifyTokenMock).toHaveBeenCalledWith('access-token');
    expect((req as Request & { user?: { patientId: string; email: string } }).user).toEqual({
      patientId: 'abc',
      email: 'jane@example.com',
    });
    expect(next).toHaveBeenCalledWith();
  });
});