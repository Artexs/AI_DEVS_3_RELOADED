import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

async function extractFiles() {
    const inputFile = path.join(__dirname, '../../data/S01/pliki_z_fabryki/2024-11-12_report-99');
    const outputDir = path.join(__dirname, '../../data/S01/pliki_z_fabryki/extracted');

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Read the entire file
    const data = fs.readFileSync(inputFile);

    // Find JPEG end marker (0xFF 0xD9)
    let jpegEnd = -1;
    for (let i = 0; i < data.length - 1; i++) {
        if (data[i] === 0xFF && data[i + 1] === 0xD9) {
            jpegEnd = i + 2; // Include the end marker
            break;
        }
    }

    if (jpegEnd === -1) {
        console.error('Could not find JPEG end marker');
        return;
    }

    // Extract JPEG
    const jpegData = data.slice(0, jpegEnd);
    fs.writeFileSync(path.join(outputDir, 'image.jpg'), jpegData);
    console.log('JPEG file extracted successfully');

    // Extract ZIP
    const zipData = data.slice(jpegEnd);
    const zipPath = path.join(outputDir, 'archive.zip');
    fs.writeFileSync(zipPath, zipData);
    console.log('ZIP file extracted successfully');

    // Extract ZIP contents
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(outputDir, true);
    console.log('ZIP contents extracted successfully');

    // Check if flag.png was extracted
    const flagPath = path.join(outputDir, 'flag.png');
    if (fs.existsSync(flagPath)) {
        console.log('flag.png was successfully extracted');
    } else {
        console.error('flag.png was not found in the extracted files');
    }
}

extractFiles().catch(console.error);
