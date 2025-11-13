const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MongoDB connection
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Collections
let usersCollection;
let testimonialsCollection;
let partnersCollection;
let requestsCollection;
async function connectDB() {
  try {
    await client.connect();
    console.log(" Connected to MongoDB");

    // 🔹 Students Collection
    const studentsDB = client.db("StudentsCollection");
    usersCollection = studentsDB.collection("users");
    console.log(" Users collection ready");

    // 🔹 Testimonials Collection
    const testimonialsDB = client.db("Testimonials");
    testimonialsCollection = testimonialsDB.collection("testimonials");
    console.log(" Testimonials collection ready");

    // 🔹 Partner Requests Collection
    const partnerRequestsDB = client.db("partnerRequests");
    requestsCollection = partnerRequestsDB.collection("requests");
    console.log(" Requests collection ready");

    // 🔹 Study Partners Collection
    const studyPartnersDB = client.db("StudyPartnersCollection");
    partnersCollection = studyPartnersDB.collection("partners");
    console.log("Partners collection ready");

  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
}



// Users Routes
app.get("/users", async (req, res) => {
  try {
    const users = await usersCollection.find().toArray();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/users", async (req, res) => {
  try {
    const newUser = req.body;
    const result = await usersCollection.insertOne(newUser);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/users/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//  Partners Routes

//  Create Partner Profile
app.post("/partners", async (req, res) => {
  try {
    const newPartner = { ...req.body, partnerCount: 0 };
    const result = await partnersCollection.insertOne(newPartner);
    res
      .status(201)
      .json({ message: "Profile created successfully!", partnerId: result.insertedId });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//  Get all partners with optional search & sort
app.get("/partners", async (req, res) => {
  try {
    const { search, sort } = req.query;
    let query = {};

    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { subject: { $regex: search, $options: "i" } },
          { location: { $regex: search, $options: "i" } },
        ],
      };
    }

    let cursor = partnersCollection.find(query);

    if (sort) {
      let sortOption = {};
      if (sort === "rating") sortOption = { rating: -1 };
      if (sort === "experience") sortOption = { experience: 1 };
      cursor = cursor.sort(sortOption);
    }

    const partners = await cursor.toArray();
    res.json(partners);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//  Get Partner Details by ID
app.get("/partners/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const partner = await partnersCollection.findOne({ _id: new ObjectId(id) });
    if (!partner) return res.status(404).json({ message: "Partner not found" });
    res.json(partner);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//  Send Partner Request (increment partnerCount + save request)
app.post("/partners/:id/request", async (req, res) => {
  try {
    const id = req.params.id;
    const { senderEmail, receiverEmail, name, studyMode, time, location } = req.body;

    const newRequest = {
      senderEmail,
      receiverEmail,
      name,
      studyMode,
      time,
      location,
      status: "pending",
      createdAt: new Date(),
    };

    const savedRequest = await requestsCollection.insertOne(newRequest);

    await partnersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $inc: { partnerCount: 1 } }
    );

    res.json({ message: "Partner request sent successfully!", data: savedRequest });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET /my-connections/:email
app.get("/my-connections/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const userRequests = await requestsCollection.find({ senderEmail: email }).toArray();
    res.json(userRequests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/connections/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const updateData = req.body;

    const result = await requestsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: "after" }
    );

    res.json(result.value);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete("/connections/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await requestsCollection.deleteOne({ _id: new ObjectId(id) });
    res.json({ message: "Request deleted successfully", deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




app.get("/testimonials", async (req, res) => {
  try {
    const testimonials = await testimonialsCollection.find().toArray();
    res.json(testimonials);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Default route
app.get("/", (req, res) => {
  res.send(" StudyMate Server is running successfully!");
});

// Start server
connectDB().then(() => {
  app.listen(PORT, () => console.log(` Server running on port ${PORT}`));
});
