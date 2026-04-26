import nodemailer from "nodemailer"
import dotenv from "dotenv"
import ejs from "ejs"
import path from "path"

dotenv.config()

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    service: process.env.SMTP_SERVICE, // use STARTTLS (upgrade connection to TLS after connecting)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

const verifyTransporter = async () => {
  try {
    await transporter.verify();
    console.log("Server is ready to take our messages");
  } catch (err) {
    console.error("Verification failed:", err);
  }
};


//Render EJS email template 
const renderEmailTemplate = async (templateName: string, data: Record<string, any>): Promise<string> => {
  const templatePath = path.join(
    process.cwd(),
    "apps",
    "auth-service",
    "src",
    "utils",
    "email-templates",
    `${templateName}.ejs`
  )
  return ejs.renderFile(templatePath, data)
}



export const sendEmail = async (
  to: string,
  subject: string,
  templateName: string,
  data: Record<string, any>
): Promise<boolean> => {
  await verifyTransporter();
  try {
    if (!to?.trim()) {
      throw new Error("Recipient email is required");
    }

    const html = await renderEmailTemplate(templateName, data)

    await transporter.sendMail({
      from : `<${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    })
    return true
  } catch(e) {
    console.log("Error sending email", e)
    return false
  }
}