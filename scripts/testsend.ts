import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY);

const fullName = 'Test User';

resend.emails.send({
  from: 'onboarding@resend.dev',
  to: 'galileon.destura@gmail.com',
  subject: 'Hello World',
  html: `     <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px; color: #333; line-height: 1.6;">
                  <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRqGZ2q_B3lHd4S4KdtU8X_869M3PpGPlMZow&s" alt="Arduino Day" style="max-width: 100%; border-radius: 8px;" />
                  </div>
                  <p>Beep boop bop… signal received!</p>
                  <p>You’re officially connected to Arduino Day Philippines, <strong>${fullName}</strong> 🤖⚡<br/>
                  Our system confirms your presence as a valued guest, and we are beyond excited to have you join us for a day full of innovation, creativity, and tech magic!</p>
                  <p>🔌 Before you boot up and arrive, please remember to bring:</p>
                  <ul style="margin: 0 0 20px 0;">
                    <li>Your valid ID (for verification)</li>
                    <li>Your QR Code</li>
                    <li>Your energy and curiosity 💡</li>
                  </ul>
                  <p>📎 Your QR Code is attached to this email — this is your entry pass, so make sure to <strong>SAVE IT</strong> for scanning upon arrival!</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <p style="font-size: 14px; color: #666; margin-bottom: 10px;">Your Entry Pass:</p>
                    <img src="cid:ticket-qr" alt="QR Code" style="width: 250px; height: 250px; border: 2px solid #eaeaea; border-radius: 8px; padding: 10px;" />
                  </div>
                  <p>Get ready to explore circuits, code, and creativity with fellow innovators. We can't wait to see you there!</p>
                  <p>If you have any concerns, feel free to reach out to any of the following:</p>
                  <ul>
                    <li>Leon Destura (Organizing Team) - <a href="mailto:galileon.destura@gmail.com">galileon.destura@gmail.com</a></li>
                    <li>Wakin Cean Maclang (Organizing Team) - <a href="mailto:maclangw26@gmail.com">maclangw26@gmail.com</a></li>
                  </ul>
                  <p>See you there! 🚀</p>
                  <strong>The Organizing Team</strong></p>
                </div>`
});