import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

//function for connecting to the database
async function dbConnection() {
  try {
    //passing the connection string to the mongoclient from the .env file
    const client = new MongoClient(process.env.MONGODB_URL);
    //awaiting and connecting to the db
    await client.connect();
    console.log("Database connected");
    return client;
  } catch (error) {
    console.log("Error connecting database");
  }
}
export const client = await dbConnection();
