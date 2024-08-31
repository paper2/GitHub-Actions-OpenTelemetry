import * as opentelemetry from '@opentelemetry/api'

export const createGuage = (
  name: string,
  value: number,
  attributes: opentelemetry.Attributes
) => {
  const meter = opentelemetry.metrics.getMeter('github-actions-metrics')
  const guage = meter.createObservableGauge(name)
  // NOTE: Usyally, this callback is called by interval. But in this library, we call it manually last once.
  guage.addCallback(result => {
    result.observe(value, attributes)
    console.log(`Guage: ${name} ${value} ${JSON.stringify(attributes)}`)
  })
}
