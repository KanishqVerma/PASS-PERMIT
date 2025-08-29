// const handlebars = require('handlebars');
// const puppeteer = require('puppeteer');
// const fs = require('fs/promises');
// const qrcode = require('qrcode'); // Import the new library
// const User = require('./models/user.js');

// // --- Configuration ---
// const validityInMonths = 2;
// const visitorData = {
//     s_no: 1,
//     name: User.name,
//     govt_id: '268897750258',
//     company: 'N/A'
// };

// // --- Date Calculation ---
// function getPassDates(validityMonths) {
//     const issueDate = new Date();
//     const expiryDate = new Date(issueDate);
//     expiryDate.setMonth(expiryDate.getMonth() + validityMonths);
//     const formatDate = (date) => `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
//     return { issue: formatDate(issueDate), expiry: formatDate(expiryDate) };
// }

// async function createGatePass() {
//     // 1. Prepare data (dates, image, QR code)
//     const dates = getPassDates(validityInMonths);
//     const headerImage = await fs.readFile('pass_header.jpg', 'base64');

//     // Create a JSON string for the QR code
//     const qrCodeData = JSON.stringify({
//         name: visitorData.name,
//         id: visitorData.govt_id,
//         expires: dates.expiry
//     });
//     const qrCodeImage = await qrcode.toDataURL(qrCodeData);

//     const passData = {
//         headerImage,
//         qrCodeImage, // Add QR code to data
//         issueDate: dates.issue,
//         validity: `${validityInMonths} Months`,
//         expiryDate: dates.expiry,
//         visitors: [visitorData]
//     };

//     // 2. Compile template
//     const templateHtml = await fs.readFile('pass_template_final.html', 'utf-8');
//     const template = handlebars.compile(templateHtml);
//     const finalHtml = template(passData);

//     // 3. Generate PDF
//     console.log('Generating final PDF...');
//     const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
//     const page = await browser.newPage();
//     await page.setContent(finalHtml, { waitUntil: 'networkidle0' });
//     const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
//     await browser.close();

//     // 4. Save file
//     const outputFilename = `Gate_Pass_${visitorData.name.replace(' ', '_')}.pdf`;
//     await fs.writeFile(outputFilename, pdfBuffer);
    
//     console.log(`✅ Final gate pass successfully generated: ${outputFilename}`);
// }

// createGatePass();

const handlebars = require('handlebars');
const puppeteer = require('puppeteer');
const fs = require('fs/promises');
const qrcode = require('qrcode');
const User = require('../models/user');
const HR = require('../models/hr');
 const path = require("path");

/**
 * Main function to generate the gate pass.
 * It takes a data object, creates a PDF, and saves it.
 */
async function generatePass(passData) {
    try {
        // Prepare QR code from the data
        const qrCodeData = JSON.stringify({
            name: passData.visitors[0].name,
            id: passData.visitors[0].govt_id,
            expires: passData.expiryDate
        });
        const qrCodeImage = await qrcode.toDataURL(qrCodeData);

        // Read the stamp image
        // const stampImage = await fs.readFile('stamp.jpg', 'base64');
        const stampImage = await fs.readFile(path.join(__dirname, "stamp.jpg"), "base64");
        const templateHtml = await fs.readFile(
            path.join(__dirname, "pass_template_final.html"),
            "utf-8"
        );


        // Add generated images to the data object
        passData.qrCodeImage = qrCodeImage;
        passData.stampImage = stampImage;
        
        // Compile the HTML template with the final data
        // const templateHtml = await fs.readFile('pass_template_final.html', 'utf-8');
        const template = handlebars.compile(templateHtml);
        const finalHtml = template(passData);

        // Generate the PDF using Puppeteer
        console.log('Generating PDF...');
        const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(finalHtml, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        // Save the final PDF file
        const outputFilename = `Gate_Pass_${passData.visitors[0].name.replace(' ', '_')}.pdf`;
        await fs.writeFile(outputFilename, pdfBuffer);
        
        console.log(`✅ Gate pass successfully generated: ${outputFilename}`);

    } catch (error) {
        console.error("Error generating PDF:", error);
    }
}

// --- SCRIPT EXECUTION STARTS HERE ---

// This self-executing async function prepares the data and calls generatePass
(async () => {
    // 1. Define your dynamic data here
    const validityInMonths = 2;
    const visitorData = {
        s_no: 1,
        name: User.name,
        govt_id: '268897750258',
        company: 'N/A'
    };
    
    // 2. Calculate dates
    const issueDate = new Date();
    const expiryDate = new Date(issueDate);
    expiryDate.setMonth(expiryDate.getMonth() + validityInMonths);
    
    const formatDate = (date) => `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;

    // 3. Read the header image and prepare the data object

    // const headerImage = await fs.readFile('pass_header.jpg', 'base64');
   
        const headerImage = await fs.readFile(
            path.join(__dirname, "pass_header.jpg"),
            "base64"
            );

    
    const passData = {
        headerImage: headerImage,
        department: 'IT Division, NR Office',
        issueDate: formatDate(issueDate),
        expiryDate: formatDate(expiryDate),
        validity: `${validityInMonths} Months`,
        visitors: [visitorData]
    };
    
    // 4. Call the main function with the data
    await generatePass(passData);
})();
