import express from 'express'


const app = express()
const port = 3001

app.use(express.json())


app.get('/health', (_req, res) => {
    res.json({
        service: "ingestion-service"
    })
})

app.listen(port, () => {
    console.log(`Ingestion Service listening on port ${port}`)
})