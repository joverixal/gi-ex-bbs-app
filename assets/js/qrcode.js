$(document).ready(function() {
    // Example GUID and user info
    const guidId = '123e4567-e89b-12d3-a456-426614174000';
    const userName = 'Joverixal Entuna';
    const batchYear = '2011';
    const logoSrc = 'assets/images/anhs-2011-logo.png';

    // Generate QR code in hidden canvas
    $('#qrcode').qrcode({
        text: guidId,
        width: 250,
        height: 250,
        colorDark: "#000000",
        colorLight: "#ffffff"
    });

    $('#btn-download').click(function() {
        const qrCanvas = $('#qrcode canvas')[0];
        if (!qrCanvas) {
            toastr.error("QR Code not available!");
            return;
        }

        // Create final canvas
        const finalCanvas = document.createElement('canvas');
        const ctx = finalCanvas.getContext('2d');
        const logo = new Image();
        logo.src = logoSrc;

        logo.onload = function() {
            const qrSize = 250;
            const padding = 20;
            const logoMax = 60; // small logo
            const textHeight = 25;

            // Scale logo proportionally
            let logoWidth = logo.width;
            let logoHeight = logo.height;
            const scale = Math.min(logoMax / logoWidth, logoMax / logoHeight, 1);
            logoWidth *= scale;
            logoHeight *= scale;

            // Canvas size: logo + QR + padding + text
            finalCanvas.width = qrSize + padding * 2;
            finalCanvas.height = qrSize + padding * 2 + logoHeight + textHeight + 20;

            // Fill white background
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

            // Draw logo on top
            const logoX = (finalCanvas.width - logoWidth) / 2;
            const logoY = padding;
            ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);

            // Draw QR below logo
            const qrY = logoY + logoHeight + 10;
            ctx.drawImage(qrCanvas, padding, qrY, qrSize, qrSize);

            // Draw Name and Batch Year in same row with labels bold
            const textY = qrY + qrSize + 25;
            ctx.textAlign = "center";

            // Bold "Name:" part
            ctx.font = "bold 18px Arial";
            ctx.fillStyle = "#E41200";
            ctx.fillText("Name: ", finalCanvas.width/2 - 80, textY);

            // Regular name
            ctx.font = "16px Arial";
            ctx.fillStyle = "#000000";
            ctx.fillText(userName, finalCanvas.width/2 - 15, textY);

            // Bold "Batch Year:" part
            ctx.font = "bold 18px Arial";
            ctx.fillStyle = "#E41200";
            ctx.fillText("Batch Year: ", finalCanvas.width/2 + 70, textY);

            // Regular batch year
            ctx.font = "16px Arial";
            ctx.fillStyle = "#000000";
            ctx.fillText(batchYear, finalCanvas.width/2 + 165, textY);

            // Download final image
            const link = document.createElement('a');
            link.href = finalCanvas.toDataURL("image/png");
            link.download = `${userName}_ANHS${batchYear}_QR.png`;
            link.click();

            toastr.success("QR Code downloaded with logo and formatted Name/Batch Year!");
        };
    });
});
