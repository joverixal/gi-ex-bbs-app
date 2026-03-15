$(document).ready(function() {
    // Example GUID and user info
    const guidId = '123e4567-e89b-12d3-a456-426614174000';
    const userName = 'Joverixal Entuna';
    const batchYear = '2011';
    const logoSrc = 'assets/images/anhs-2011-logo.png';

    // Generate QR code
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
            const titleHeight = 25;
            const infoHeight = 50; // Name + Batch stacked

            // Scale logo proportionally
            let logoWidth = logo.width;
            let logoHeight = logo.height;
            const scale = Math.min(logoMax / logoWidth, logoMax / logoHeight, 1);
            logoWidth *= scale;
            logoHeight *= scale;

            // Canvas size: logo + title + info + QR + padding
            finalCanvas.width = qrSize + padding * 2;
            finalCanvas.height = logoHeight + titleHeight + infoHeight + qrSize + padding * 3;

            // Fill white background
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

            let currentY = padding;

            // Draw logo on top
            const logoX = (finalCanvas.width - logoWidth) / 2;
            ctx.drawImage(logo, logoX, currentY, logoWidth, logoHeight);
            currentY += logoHeight + 10;

            // Draw title
            ctx.fillStyle = "#E41200";
            ctx.font = "bold 20px Arial";
            ctx.textAlign = "center";
            ctx.fillText("Your QR Code", finalCanvas.width / 2, currentY + 18);
            currentY += titleHeight;

            // Draw Name
            ctx.fillStyle = "#E41200";
            ctx.font = "bold 16px Arial";
            ctx.textAlign = "center";
            ctx.fillText("Name:", finalCanvas.width / 2, currentY + 16);

            ctx.fillStyle = "#000000";
            ctx.font = "16px Arial";
            ctx.fillText(userName, finalCanvas.width / 2, currentY + 36);
            currentY += 40;

            // Draw Batch Year
            ctx.fillStyle = "#E41200";
            ctx.font = "bold 16px Arial";
            ctx.fillText("Batch Year:", finalCanvas.width / 2, currentY + 16);

            ctx.fillStyle = "#000000";
            ctx.font = "16px Arial";
            ctx.fillText(batchYear, finalCanvas.width / 2, currentY + 36);
            currentY += 50;

            // Draw QR code
            ctx.drawImage(qrCanvas, padding, currentY, qrSize, qrSize);

            // Download final image
            const link = document.createElement('a');
            link.href = finalCanvas.toDataURL("image/png");
            link.download = `${userName}_ANHS${batchYear}_QR.png`;
            link.click();

            toastr.success("QR Code downloaded matching UI layout!");
        };
    });
});
