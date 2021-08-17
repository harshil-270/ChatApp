const transporter = require('../auth/emailAuth');

const wrapedSendMail = async (mailOptions) => {
    try {
        const info = await transporter.sendMail(mailOptions);
        return { success: true, info};
    } catch (error) {
        return { success: false, error};
    }
};

module.exports = wrapedSendMail;