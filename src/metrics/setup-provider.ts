import * as opentelemetry from '@opentelemetry/api'
import { createExporter, createProvider } from './create-provider.js'
import { MeterProvider } from '@opentelemetry/sdk-metrics'

export const setupMeterProvider = (): MeterProvider => {
  const exporter = createExporter()
  const provider = createProvider(exporter)
  opentelemetry.metrics.setGlobalMeterProvider(provider)
  return provider
}

export const shutdown = async (provider: MeterProvider): Promise<void> => {
  try {
    await provider.forceFlush()
    await provider.shutdown()
  } catch (error) {
    console.log('Error terminating MetricProvider', error)
    process.exit(1)
  }
  process.exit(0)
}
