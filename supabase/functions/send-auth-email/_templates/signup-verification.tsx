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

interface SignupVerificationEmailProps {
  verificationUrl: string;
  userEmail: string;
}

export const SignupVerificationEmail = ({
  verificationUrl,
  userEmail,
}: SignupVerificationEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to Crunch Carbon - Verify your email address</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to the Crunch Carbon team!</Heading>
        
        <Text style={text}>
          Hi there! We're excited to have you join us in the carbon credit revolution.
        </Text>

        <Text style={text}>
          Please verify your email address by clicking the button below:
        </Text>

        <Section style={buttonContainer}>
          <Button style={button} href={verificationUrl}>
            Verify Email Address
          </Button>
        </Section>

        <Text style={text}>
          Or copy and paste this link into your browser:
        </Text>

        <Text style={link}>
          {verificationUrl}
        </Text>

        <Text style={textSmall}>
          This verification link will expire in 24 hours for security reasons.
        </Text>

        <Text style={textSmall}>
          Security first, this is South Africa after all ;)
        </Text>

        <Text style={footer}>
          If you didn't create an account with Crunch Carbon, you can safely ignore this email.
        </Text>

        <Text style={footer}>
          Need help? Contact us at support@crunchcarbon.com
        </Text>
      </Container>
    </Body>
  </Html>
);

export default SignupVerificationEmail;

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
  fontStyle: "italic",
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
