const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');  // For hashing passwords

const app = express();
const port = process.env.PORT || 3001;  // Port configuration

// Middleware to parse request bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// MongoDB connection (update with your database details)
mongoose.connect('mongodb+srv://manishtest011:UtZwV5C4E1XBIUd7@manish.az4hy.mongodb.net/?retryWrites=true&w=majority&appName=Manish', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.log('Error connecting to MongoDB:', error));

// Admin Schema
const adminSchema = new mongoose.Schema({
  email: String,
  password: String, // This will be the hashed password
  otp: String,
  otpExpiration: Date,
});

const Admin = mongoose.model('Admin', adminSchema);

// Nodemailer Transporter Setup for OTP email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'manishinteresting@gmail.com',  // Your Gmail email
    pass: 'eaea vecn uolf dkgy',  // Your Gmail app-specific password
  }
});

// Function to generate OTP
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

// Function to send OTP via email
function sendOTPEmail(email, otp) {
  const mailOptions = {
    from: 'manishinteresting@gmail.com',
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP is: ${otp}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error sending OTP:', error);
    } else {
      console.log('OTP sent:', info.response);
    }
  });
}

// Create Admin with Temporary Password (for initial setup)
async function createAdmin() {
  const email = "manishinteresting@gmail.com";
  const temporaryPassword = "temporarypassword123"; // Temporary password

  const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

  // Save the admin to MongoDB
  const admin = new Admin({
    email,
    password: hashedPassword,  // Store hashed password
  });

  await admin.save();
  console.log('Admin created successfully with temporary password.');
}

createAdmin();  // Call this function to create the admin with a temporary password

// Admin Login Route
app.post('/admin-login', async (req, res) => {
  const { email, password } = req.body;

  // Find admin by email
  const admin = await Admin.findOne({ email });

  if (!admin) {
    return res.status(400).json({ message: 'Admin not found' });
  }

  // Compare entered password with stored hashed password
  const isPasswordValid = await bcrypt.compare(password, admin.password);

  if (!isPasswordValid) {
    return res.status(400).json({ message: 'Invalid password' });
  }

  // Successful login
  res.json({ message: 'Login successful', admin: { email: admin.email } });
});

// Forgot Password Route (Send OTP)
app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  // Find admin by email
  const admin = await Admin.findOne({ email });

  if (!admin) {
    return res.status(400).json({ message: 'Admin not found' });
  }

  const otp = generateOTP();
  const otpExpiration = new Date(Date.now() + 5 * 60 * 1000); // OTP valid for 5 minutes

  // Update OTP and expiration in the admin document
  admin.otp = otp;
  admin.otpExpiration = otpExpiration;
  await admin.save();

  sendOTPEmail(email, otp);

  res.json({ message: 'OTP sent successfully!' });
});

// Reset Password Route (After OTP Verification)
app.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;

  // Find admin by email
  const admin = await Admin.findOne({ email });

  if (!admin) {
    return res.status(400).json({ message: 'Admin not found' });
  }

  // Verify OTP and check expiration
  if (admin.otp !== otp) {
    return res.status(400).json({ message: 'Invalid OTP' });
  }

  if (new Date() > admin.otpExpiration) {
    return res.status(400).json({ message: 'OTP expired' });
  }

  // Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update the password and clear OTP fields
  admin.password = hashedPassword;
  admin.otp = null;
  admin.otpExpiration = null;
  await admin.save();

  res.json({ message: 'Password reset successful!' });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
