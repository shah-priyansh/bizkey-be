const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected for admin creation'))
.catch(err => console.log('MongoDB connection error:', err));

async function createAdminUser() {
  try {

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@gmail.com' });
    if (existingAdmin) {
      console.log('✅ Admin user already exists!');
      console.log('📧 Email: admin@gmail.com');
      console.log('🔑 Password: admin123');
      return;
    }

    // Create admin user with a proper password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = new User({
      email: 'admin@gmail.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      phone: '+91-7202976525',
      isActive: true
    });

    await adminUser.save();
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@gmail.com');
    console.log('🔑 Password: admin123');
    console.log('👤 Username: admin');
    console.log('🔐 Role: admin');

  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
  } finally {
    mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run admin creation
createAdminUser();
