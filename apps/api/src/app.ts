import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'

import alertsRouter from './routes/alerts'
import favoritesRouter from './routes/favorites'
import healthRouter from './routes/health'
import pricesRouter from './routes/prices'
import productsRouter from './routes/products'
import storesRouter from './routes/stores'
import usersRouter from './routes/users'

export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }))
  app.use(express.json())
  app.use(morgan('dev'))

  app.get('/ping', (_req, res) => res.json({ status: 'ok' }))

  app.use('/products', productsRouter)
  app.use('/prices', pricesRouter)
  app.use('/stores', storesRouter)
  app.use('/alerts', alertsRouter)
  app.use('/favorites', favoritesRouter)
  app.use('/users', usersRouter)
  app.use('/health', healthRouter)

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }))

  return app
}
