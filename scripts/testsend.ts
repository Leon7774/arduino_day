import { Resend } from 'resend';

const resend = new Resend('re_JW5LXhQG_B96HQATQH7GfrnrFu4TPppsT');

resend.emails.send({
  from: 'onboarding@resend.dev',
  to: 'galileon.destura@gmail.com',
  subject: 'Hello World',
  html: '<p>Congrats on sending your <strong>first email</strong>!</p>'
});