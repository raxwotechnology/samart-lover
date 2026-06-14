const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Prefer MONGO_URI (full connection string) over individual DB_USER/DB_PASSWORD/DB_NAME
    let atlasUri = process.env.MONGO_URI;

    if (!atlasUri) {
      const dbUser = process.env.DB_USER;
      const dbPassword = process.env.DB_PASSWORD;
      const dbName = process.env.DB_NAME;
      if (dbUser && dbPassword && dbName) {
        atlasUri = `mongodb+srv://${dbUser}:${encodeURIComponent(dbPassword)}@cluster0.xqltkqh.mongodb.net/${dbName}?retryWrites=true&w=majority`;
      }
    }

    if (!atlasUri) {
      throw new Error('Missing MongoDB configuration. Set MONGO_URI (or DB_USER, DB_PASSWORD, DB_NAME).');
    }

    const conn = await mongoose.connect(atlasUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
