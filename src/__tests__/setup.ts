process.env.JWT_SECRET = 'test-secret-key-for-jest';
// Read at module load by the register resolver; this email bootstraps to admin.
process.env.ADMIN_EMAILS = 'boss@example.com';
