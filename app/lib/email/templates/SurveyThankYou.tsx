import { Html, Head, Body, Container, Heading, Text, Button, Hr } from '@react-email/components'

export function SurveyThankYouEmail({ name, surveyTitle, registerUrl }: {
  name: string, surveyTitle: string, registerUrl: string
}) {
  return (
    <Html>
      <Head />
      <Body style={{ background: '#f9fafb', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ color: '#1A1A2E', fontSize: 24 }}>
            感谢参与调研！
          </Heading>
          <Text style={{ color: '#374151' }}>
            尊敬的 {name}，感谢您参与《{surveyTitle}》调研！
          </Text>
          <Text style={{ color: '#374151' }}>
            🎁 注册 Koala PhD 即可获得 20 积分，可用于：
          </Text>
          <Text style={{ color: '#6B7280' }}>
            • AI 智能选校规划{'\n'}
            • 教授精准匹配{'\n'}
            • 个性化套磁信撰写
          </Text>
          <Button href={registerUrl} style={{
            background: '#1A1A2E', color: '#ffffff', padding: '12px 24px',
            borderRadius: 8, textDecoration: 'none', display: 'inline-block'
          }}>
            立即注册领取积分 →
          </Button>
          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
          <Text style={{ color: '#9ca3af', fontSize: 12 }}>
            Koala PhD · koalaphd.com · 微信：KoalaStudyAdvisor
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
