import { describe, test, expect, vi, beforeEach } from 'vitest'
import * as opentelemetry from '@opentelemetry/api'
import {
  InMemoryMetricExporter,
  AggregationTemporality,
  MeterProvider
} from '@opentelemetry/sdk-metrics'
import * as createProvider from './create-provider.js'
import { setupMeterProvider, shutdown } from './setup-provider.js'

vi.mock('./create-provider.js', async importOriginal => {
  const mod = await importOriginal<typeof import('./create-provider.js')>()
  return {
    ...mod,
    forceFlush: vi.fn()
  }
})

describe('Metrics Exporter Tests', () => {
  const mockExit = vi
    .spyOn(process, 'exit')
    .mockImplementation((code?: number | string | null | undefined): never => {
      throw new Error(`process.exit called with code: ${code}`)
    })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('should export metrics using global meter provider', async () => {
    const inMemoryMetricExporter = new InMemoryMetricExporter(
      AggregationTemporality.DELTA
    )
    const mockCreateExporter = vi
      .spyOn(createProvider, 'createExporter')
      .mockReturnValueOnce(inMemoryMetricExporter)

    // NOTE: setupMeterProvider invokes setGlobalMeterProvider affecting in global scope.
    //       Basically mocking meter provider for testing and not using it in global scope.
    const provider = setupMeterProvider()
    expect(mockCreateExporter).toHaveBeenCalledOnce()

    const meter = opentelemetry.metrics.getMeter('test')
    const gauge = meter.createObservableGauge('test_gauge')
    gauge.addCallback(result => {
      result.observe(1234, { testKey: 'testValue' })
    })

    await expect(shutdown(provider)).rejects.toThrow(
      'process.exit called with code: 0'
    )
    expect(inMemoryMetricExporter.getMetrics()).toMatchObject([
      {
        scopeMetrics: [
          {
            scope: { name: 'test', version: '', schemaUrl: undefined },
            metrics: [
              {
                descriptor: {
                  name: 'test_gauge',
                  type: 'OBSERVABLE_GAUGE',
                  description: '',
                  unit: '',
                  valueType: 1,
                  advice: {}
                },
                aggregationTemporality: 0,
                dataPointType: 2,
                dataPoints: [
                  {
                    attributes: { testKey: 'testValue' },
                    value: 1234
                  }
                ]
              }
            ]
          }
        ]
      }
    ])
    expect(mockExit).toHaveBeenCalledWith(0)
  })
  test('should exit 1', async () => {
    const provider: Partial<MeterProvider> = {
      forceFlush: vi
        .fn()
        .mockRejectedValueOnce(new Error('mocked forceFlush throw error'))
    }
    await expect(shutdown(provider as MeterProvider)).rejects.toThrow(
      'process.exit called with code: 1'
    )
    expect(mockExit).toHaveBeenCalledWith(1)
  })
})
