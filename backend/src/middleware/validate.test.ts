import { z } from 'zod';
import { validate } from './validate';
import { AppError } from './errorHandler';

describe('validate middleware', () => {
  const schema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters long'),
    age: z.coerce.number().int().positive('Age must be positive'),
  });

  it('parses a valid body and replaces req.body with the parsed value', () => {
    const req = { body: { name: 'Jane', age: '29' } } as never;
    const res = {} as never;
    const next = jest.fn();

    validate(schema)(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect((req as { body: { name: string; age: number } }).body).toEqual({
      name: 'Jane',
      age: 29,
    });
  });

  it('passes an AppError with field-level details for invalid input', () => {
    const req = { body: { name: 'J', age: 0 } } as never;
    const res = {} as never;
    const next = jest.fn();

    validate(schema)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0] as AppError;
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details).toEqual({
      fields: {
        name: ['Name must be at least 2 characters long'],
        age: ['Age must be positive'],
      },
    });
  });
});