import { serve } from 'inngest/next'
import { inngest } from '@/app/lib/inngest/client'
import { sendSurveyThankYou } from '@/app/lib/inngest/functions'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [sendSurveyThankYou],
})
