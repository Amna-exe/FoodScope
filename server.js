require('dotenv').config();
const app = require('./src/app')

const connectDB = require('./src/db/connection')
connectDB();


app.listen(process.env.PORT,()=>{
    console.log(`The server is running on ${process.env.PORT }`);
});