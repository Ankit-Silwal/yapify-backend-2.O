import app from './app.js';
import dotenv from 'dotenv';

dotenv.config();
const port=process.env.PORT;

app.listen(port,()=>{
  console.log(`Server is running sir at port no ${port}`);
})