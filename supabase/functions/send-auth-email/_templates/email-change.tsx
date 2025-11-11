import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "npm:@react-email/components@0.0.22";
import * as React from "npm:react@18.3.1";

interface EmailChangeEmailProps {
  confirmUrl: string;
  userEmail: string;
}

export const EmailChangeEmail = ({
  confirmUrl,
  userEmail,
}: EmailChangeEmailProps) => (
  <Html>
    <Head />
    <Preview>Confirm your email address change</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Confirm Email Address Change</Heading>
        
        <Text style={text}>
          We received a request to change the email address for your Crunch Carbon account to {userEmail}.
        </Text>

        <Text style={text}>
          Please confirm this change by clicking the button below:
        </Text>

        <Section style={buttonContainer}>
          <Button style={button} href={confirmUrl}>
            Confirm Email Change
          </Button>
        </Section>

        <Text style={text}>
          Or copy and paste this link into your browser:
        </Text>

        <Text style={link}>
          {confirmUrl}
        </Text>

        <Text style={textSmall}>
          This confirmation link will expire in 24 hours for security reasons.
        </Text>

        <Text style={alertText}>
          If you didn't request this email change, please contact support immediately at support@crunchcarbon.com. Your account security may be at risk.
        </Text>

        <Text style={footer}>
          Stay secure,<br />
          The Crunch Carbon Team
        </Text>
      </Container>
    </Body>
  </Html>
);

export default EmailChangeEmail;

const main = {
  backgroundColor: "#ffffff",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "600px",
};

const h1 = {
  color: "#1a1a1a",
  fontSize: "24px",
  fontWeight: "700",
  lineHeight: "1.4",
  margin: "0 0 24px",
};

const text = {
  color: "#1a1a1a",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 16px",
};

const textSmall = {
  color: "#666666",
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "0 0 12px",
};

const alertText = {
  color: "#dc2626",
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "24px 0",
  padding: "12px",
  backgroundColor: "#fef2f2",
  borderRadius: "6px",
};

const buttonContainer = {
  margin: "32px 0",
};

const button = {
  backgroundColor: "#F5D547",
  borderRadius: "6px",
  color: "#1a1a1a",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "14px 24px",
};

const link = {
  color: "#2563eb",
  fontSize: "14px",
  wordBreak: "break-all" as const,
  margin: "0 0 16px",
};

const footer = {
  color: "#666666",
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "24px 0 0",
};
