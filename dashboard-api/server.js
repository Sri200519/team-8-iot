import express from 'express'
import redis from 'redis'

const app = express()
const port = 3000

app.use(express.json())

app.get('/health', (_req, res) => {
    res.json({
        service: 'Dashboard API'
    })
})

app.listen(port, () => {
    console.log(`Dashboard API listening on port ${port}`)
})