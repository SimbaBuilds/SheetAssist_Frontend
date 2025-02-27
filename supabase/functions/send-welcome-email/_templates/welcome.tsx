import React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface WelcomeEmailProps {
  name: string;
}

export function WelcomeEmail({ name }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to SS Assist - Let's get started!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome to SS Assist! 🎉</Heading>
          <Text style={text}>
            We're excited to have you on board -- here's what you can do to get started:
          </Text>
          <ul style={list}>
            <li style={listItem}>Complete your profile</li>
            <li style={listItem}>Try our visualization tools</li>
            <li style={listItem}>Check out our documentation</li>
          </ul>
          <Text style={text}>
            If you have any questions, feel free to reply to this email.
          </Text>
          <Text style={footer}>
            Best regards,<br />
            The SS Assist Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '600px',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '1.3',
  margin: '0 0 24px',
};

const text = {
  color: '#444444',
  fontSize: '16px',
  lineHeight: '1.5',
  margin: '0 0 16px',
};

const list = {
  margin: '0 0 24px',
  padding: '0 0 0 24px',
};

const listItem = {
  color: '#444444',
  fontSize: '16px',
  lineHeight: '1.5',
  margin: '0 0 8px',
};

const footer = {
  color: '#898989',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '48px 0 0',
}; 