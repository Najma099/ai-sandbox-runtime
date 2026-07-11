import "dotenv/config";
import express from 'express';
import chatRoute from './routes/chat';

const app = express();
app.use(express.json());


app.get('/health',(req, res) => {
    res.json({
        status: 'ok'
    });
});

app.use(chatRoute);

app.listen(3000, () => {
    console.log('Server is running on the port 3000');
});
