package cc.mrbird.febs.common.utils;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;

import java.io.IOException;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

/**
 * 二维码生成工具（基于 ZXing）
 */
public class QrCodeUtil {

    /**
     * 生成二维码并写入到指定文件
     *
     * @param content  二维码内容（如预约订单号）
     * @param filePath 文件完整路径（含文件名，例如 xxx.png）
     * @param width    宽度（像素）
     * @param height   高度（像素）
     * @throws WriterException 编码异常
     * @throws IOException     IO 异常
     */
    public static void generateToFile(String content, String filePath, int width, int height) throws WriterException, IOException {
        QRCodeWriter qrCodeWriter = new QRCodeWriter();
        Map<EncodeHintType, Object> hints = new HashMap<>(2);
        hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
        hints.put(EncodeHintType.MARGIN, 1);
        BitMatrix bitMatrix = qrCodeWriter.encode(content, BarcodeFormat.QR_CODE, width, height, hints);
        Path path = java.nio.file.Paths.get(filePath);
        MatrixToImageWriter.writeToPath(bitMatrix, "PNG", path);
    }
}
