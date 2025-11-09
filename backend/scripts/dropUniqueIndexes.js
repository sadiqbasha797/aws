const mongoose = require('mongoose');
require('dotenv').config();

async function dropUniqueIndexes() {
  try {
    // Connect to MongoDB using the same connection string as the app
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/aws-project';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    // Mongoose pluralizes model names, so "ReliabilityData" becomes "reliabilitydatas"
    const collectionName = 'reliabilitydatas';
    
    // Check if collection exists
    const collections = await db.listCollections({ name: collectionName }).toArray();
    if (collections.length === 0) {
      console.log(`ℹ Collection '${collectionName}' does not exist yet. No indexes to drop.`);
      await mongoose.connection.close();
      process.exit(0);
    }
    
    const collection = db.collection(collectionName);

    // Get all indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes);

    // Drop the unique index on workerId if it exists
    try {
      await collection.dropIndex('workerId_1');
      console.log('✓ Dropped unique index on workerId_1');
    } catch (error) {
      if (error.code === 27 || error.message.includes('index not found')) {
        console.log('ℹ Index workerId_1 does not exist or already dropped');
      } else {
        throw error;
      }
    }

    // Drop the unique index on job_id if it exists
    try {
      await collection.dropIndex('job_id_1');
      console.log('✓ Dropped unique index on job_id_1');
    } catch (error) {
      if (error.code === 27 || error.message.includes('index not found')) {
        console.log('ℹ Index job_id_1 does not exist or already dropped');
      } else {
        throw error;
      }
    }

    // Drop the compound unique index on workerId + job_id + year + month if it exists
    try {
      await collection.dropIndex('workerId_1_job_id_1_year_1_month_1');
      console.log('✓ Dropped compound unique index on workerId_1_job_id_1_year_1_month_1');
    } catch (error) {
      if (error.code === 27 || error.message.includes('index not found')) {
        console.log('ℹ Compound unique index does not exist or already dropped');
      } else {
        throw error;
      }
    }

    // Verify indexes after dropping
    const indexesAfter = await collection.indexes();
    console.log('\nRemaining indexes:', indexesAfter);

    console.log('\n✓ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error dropping indexes:', error);
    process.exit(1);
  }
}

dropUniqueIndexes();

