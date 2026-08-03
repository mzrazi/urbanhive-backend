const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Vendor = require('../models/Vendor');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_APP_PASSWORD },
});

const getModel = (accountType) => accountType === 'vendor' ? Vendor : User;
const genericMessage = 'If an account exists for that email, a reset link has been sent.';

const forgotPassword = async (req, res) => {
  const { email, accountType = 'customer' } = req.body;
  const Model = getModel(accountType);
  try {
    const account = await Model.findOne({ email: String(email || '').toLowerCase() });
    if (!account) return res.json({ message: genericMessage });
    const rawToken = crypto.randomBytes(32).toString('hex');
    account.passwordResetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    account.passwordResetExpires = Date.now() + 15 * 60 * 1000;
    await account.save({ validateBeforeSave: false });
    const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
    const resetUrl = `${clientUrl}/reset-password?token=${rawToken}&account=${accountType}`;
    try {
      await transporter.sendMail({
        from: `UrbanHive <${process.env.MAIL_USER}>`,
        to: account.email,
        subject: 'Reset your UrbanHive password',
        text: `Use this link to reset your password. It expires in 15 minutes: ${resetUrl}`,
      });
    } catch (mailError) {
      account.passwordResetToken = undefined;
      account.passwordResetExpires = undefined;
      await account.save({ validateBeforeSave: false });
      throw mailError;
    }
    res.json({ message: genericMessage });
  } catch (error) {
    console.error('Password reset request failed:', error.message);
    res.status(500).json({ message: 'We could not send the reset email. Please try again later.' });
  }
};

const resetPassword = async (req, res) => {
  const { token, password, accountType = 'customer' } = req.body;
  if (!token || !password || password.length < 6) return res.status(400).json({ message: 'Use a valid reset link and a password of at least 6 characters.' });
  const Model = getModel(accountType);
  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const account = await Model.findOne({ passwordResetToken: hashedToken, passwordResetExpires: { $gt: Date.now() } });
    if (!account) return res.status(400).json({ message: 'This reset link is invalid or has expired.' });
    account.password = await bcrypt.hash(password, 10);
    account.passwordResetToken = undefined;
    account.passwordResetExpires = undefined;
    await account.save();
    res.json({ message: 'Your password has been reset. You can now sign in.' });
  } catch (error) {
    res.status(500).json({ message: 'We could not reset your password. Please try again.' });
  }
};

module.exports = { forgotPassword, resetPassword };
