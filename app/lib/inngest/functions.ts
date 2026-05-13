import { inngest } from './client'
import { getResend } from '../email/resend'
import { SurveyThankYouEmail } from '../email/templates/SurveyThankYou'

export const sendSurveyThankYou = inngest.createFunction(
  { id: 'send-survey-thank-you', triggers: [{ event: 'survey/completed' }] },
  async ({ event }) => {
    const { name, email, surveyTitle, shareCode } = event.data as {
      name: string; email: string; surveyTitle: string; shareCode: string
    }

    if (!email || !email.includes('@')) return { skipped: true }

    const registerUrl = `https://koalaphd.com/auth/register?ref=${shareCode}`

    await getResend().emails.send({
      from: 'Koala PhD <hello@koalaphd.com>',
      to: email,
      subject: `感谢参与《${surveyTitle}》调研 — Koala PhD`,
      react: SurveyThankYouEmail({ name, surveyTitle, registerUrl }),
    })

    return { sent: true, to: email }
  }
)
