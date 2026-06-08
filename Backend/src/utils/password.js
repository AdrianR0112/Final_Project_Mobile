const bcrypt = require('bcryptjs');

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

const hashPassword = async (plainPassword) => bcrypt.hash(plainPassword, SALT_ROUNDS);

const comparePassword = async (plainPassword, passwordHash) =>
  bcrypt.compare(plainPassword, passwordHash);

module.exports = {
  hashPassword,
  comparePassword,
};
