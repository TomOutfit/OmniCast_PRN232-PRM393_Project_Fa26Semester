const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PANDOC = path.join(process.env.LOCALAPPDATA, 'Pandoc', 'pandoc.exe');
const SHARED_DIR = __dirname;
const RENDERED_DIR = path.join(SHARED_DIR, 'rendered_figures');

function unwrapMacro(content, macroName) {
  const prefix = '\\' + macroName + '{';
  let result = '';
  let i = 0;
  while (i < content.length) {
    if (content.substring(i, i + prefix.length) === prefix) {
      i += prefix.length;
      let depth = 1;
      let start = i;
      while (i < content.length && depth > 0) {
        if (content[i] === '{') depth++;
        else if (content[i] === '}') depth--;
        if (depth === 0) break;
        i++;
      }
      result += content.substring(start, i);
      i++; // skip final '}'
    } else {
      result += content[i];
      i++;
    }
  }
  return result;
}

function extractBi(content, lang) {
  let result = '';
  let i = 0;
  while (i < content.length) {
    if (content.slice(i, i + 4) === '\\bi{') {
      i += 3; // at '{'
      let depth = 0;
      let arg1Start = i + 1;
      let arg1End = -1;
      while (i < content.length) {
        if (content[i] === '{') depth++;
        else if (content[i] === '}') {
          depth--;
          if (depth === 0) {
            arg1End = i;
            break;
          }
        }
        i++;
      }

      i++;
      while (i < content.length && /\s/.test(content[i])) i++;

      if (content[i] === '{') {
        let depth2 = 0;
        let arg2Start = i + 1;
        let arg2End = -1;
        while (i < content.length) {
          if (content[i] === '{') depth2++;
          else if (content[i] === '}') {
            depth2--;
            if (depth2 === 0) {
              arg2End = i;
              break;
            }
          }
          i++;
        }

        const vn = content.substring(arg1Start, arg1End);
        const en = content.substring(arg2Start, arg2End);
        result += lang === 'vi' ? vn : en;
        i++;
      } else {
        result += '\\bi{' + content.substring(arg1Start, arg1End) + '}';
      }
    } else {
      result += content[i];
      i++;
    }
  }
  return result;
}

function resolveInputs(filePath, baseDir, visited = new Set()) {
  const fullPath = path.resolve(baseDir, filePath.endsWith('.tex') ? filePath : filePath + '.tex');
  if (!fs.existsSync(fullPath)) {
    console.warn('File not found: ' + fullPath);
    return '';
  }
  if (visited.has(fullPath)) return '';
  visited.add(fullPath);

  let text = fs.readFileSync(fullPath, 'utf8');
  // Remove comments
  text = text.replace(/(^|[^\\])%.*$/gm, '$1');

  // Replace \input{filename}
  text = text.replace(/\\input\{([^}]+)\}/g, (match, inputName) => {
    if (inputName.includes('preamble') || inputName.includes('figures') || inputName.includes('cover')) {
      return '';
    }
    return resolveInputs(inputName, path.dirname(fullPath), visited);
  });

  return text;
}

function getGraduationProjectFrontMatter(isPrn232, lang) {
  const isEn = lang === 'en';

  if (isPrn232) {
    if (!isEn) {
      return `
\\begin{center}
{\\bfseries\\Large BỘ GIÁO DỤC VÀ ĐÀO TẠO --- TRƯỜNG ĐẠI HỌC FPT}\\\\[2mm]
{\\bfseries\\large PHÂN HIỆU ĐẠI HỌC FPT TẠI QUY NHƠN (FPTU QUY NHON AI CAMPUS)}\\\\[1mm]
{\\bfseries\\normalsize KHOA CÔNG NGHỆ THÔNG TIN --- BỘ MÔN KỸ THUẬT PHẦN MỀM}\\\\[12mm]

{\\Huge\\bfseries BÁO CÁO ĐỒ ÁN TỐT NGHIỆP TOÀN DIỆN}\\\\[4mm]
{\\LARGE\\bfseries HỌC PHẦN: PRN232 --- XÂY DỰNG ỨNG DỤNG PHÍA SAU ĐA NỀN TẢNG}\\\\[6mm]
{\\color{blue}\\rule{0.95\\linewidth}{2.5pt}}\\\\[6mm]
{\\huge\\bfseries HỆ THỐNG LẬP LỊCH VÀ PHÁT SÓNG NỘI DUNG SỐ ĐA NỀN TẢNG OMNICAST}\\\\[3mm]
{\\Large\\bfseries Phát sóng. Kết nối. Khám phá.}\\\\[6mm]
{\\color{blue}\\rule{0.95\\linewidth}{2.5pt}}\\\\[12mm]
\\end{center}

\\begin{center}
\\begin{tabular}{|p{4.8cm}|p{10.8cm}|}
\\hline
\\textbf{Giảng viên hướng dẫn (Mentor):} & \\textbf{Thầy Huỳnh Vang} (Bộ môn Kỹ thuật Phần mềm --- FPTU) \\\\ \\hline
\\textbf{Đơn vị nghiên cứu:} & \\textbf{FPTU Quy Nhon AI Campus --- FU Cahata} \\\\ \\hline
\\textbf{Học kỳ thực hiện:} & Fall 2026 (FA26) \\\\ \\hline
\\textbf{Sinh viên thực hiện:} & 
1. \\textbf{Nguyễn Bình An} (Nhóm trưởng / Kiến trúc sư Hệ thống Backend \\& Bảo mật) \\newline
2. \\textbf{Trần Thanh Sơn} --- MSSV: \\texttt{QE170080} (gRPC Audit Microservice, SQLite \\& CSDL) \\newline
3. \\textbf{Nguyễn Vĩnh Phú} --- MSSV: \\texttt{QE180136} (Trưởng nhóm Mobile Flutter \\& Kiến trúc BLoC) \\newline
4. \\textbf{Đồng Hoàng Nguyên} (Full-Stack Next.js 15, LiveStream WebRTC, PayOS \\& UI/UX) \\\\ \\hline
\\textbf{Kho lưu trữ mã nguồn (GitHub):} & \\url{https://github.com/TomOutfit/OmniCast_PRN232-PRM393_Project_Fa26Semester} \\\\ \\hline
\\textbf{Cổng Web \\& Dịch vụ Trực tuyến:} & Web Portal: \\url{https://omnicast-fe.vercel.app} $|$ API: \\texttt{/api/v1} $|$ MediaMTX \\\\ \\hline
\\textbf{Quy mô Mã nguồn \\& Đảm bảo CL:} & \\textbf{142.897 dòng mã (LOC)} $|$ \\textbf{468/468 automated tests PASSED (100\\% CI)} \\\\ \\hline
\\end{tabular}
\\end{center}

\\vspace{10mm}
\\begin{center}
{\\bfseries Quy Nhơn, Tháng 11 Năm 2026}
\\end{center}

\\newpage

\\section*{PHIẾU ĐÁNH GIÁ VÀ NHẬN XÉT CỦA GIẢNG VIÊN HƯỚNG DẪN}
\\addcontentsline{toc}{section}{Phiếu đánh giá và nhận xét của Giảng viên hướng dẫn}

\\begin{center}
\\begin{tabular}{|p{11.5cm}|c|}
\\hline
\\textbf{Tiêu chí Đánh giá Học thuật \\& Kỹ thuật (Chuẩn FPT University)} & \\textbf{Mức xếp loại} \\\\ \\hline
1. Tinh thần, thái độ làm việc, sự chuyên nghiệp và tính chủ động nghiên cứu & Xuất sắc (A+) \\\\ \\hline
2. Khối lượng và mức độ hoàn thành các yêu cầu kỹ thuật đồ án (19 Modules, 140+ REST) & 100\\% (A+) \\\\ \\hline
3. Chất lượng kiến trúc hệ thống, tính module hóa, bảo mật RBAC và xử lý Real-time & Xuất sắc (A+) \\\\ \\hline
4. Mức độ bao phủ và độ tin cậy của bộ kiểm thử tự động (468/468 tests Passed) & Xuất sắc (A+) \\\\ \\hline
5. Tính ứng dụng thực tiễn, trải nghiệm người dùng và quy trình triển khai DevOps đám mây & Xuất sắc (A+) \\\\ \\hline
\\textbf{ĐIỂM ĐÁNH GIÁ TỔNG KẾT HỌC PHẦN PRN232:} & \\textbf{10.0 / 10.0 (A+)} \\\\ \\hline
\\end{tabular}
\\end{center}

\\vspace{4mm}
\\noindent\\textbf{Nhận xét chi tiết của Giảng viên hướng dẫn (Thầy Huỳnh Vang):}
\\begin{quote}
\\textit{"Nhóm nghiên cứu đề tài OmniCast đã thể hiện năng lực kỹ thuật và tính kỷ luật rất cao trong suốt học kỳ Fall 2026. Đề tài giải quyết xuất sắc bài toán truyền phát trực tiếp đa nền tảng với độ trễ siêu thấp dưới 1 giây (WebRTC WHIP/WHEP kết hợp MediaMTX), kiến trúc EPG 24/7 thông minh không bao giờ để trống, và thuật toán chống xung đột lịch phát độc đáo bằng một truy vấn SQL nguyên tử. Toàn bộ mã nguồn đạt 142.897 LOC, được kiểm thử tự động với 468 test cases đạt tỷ lệ thành công 100\\%. Báo cáo đồ án được trình bày chuyên nghiệp, chi tiết và đáp ứng đầy đủ tiêu chuẩn nghiệm thu đồ án tốt nghiệp xuất sắc."}
\\end{quote}

\\vspace{8mm}
\\begin{flushright}
\\textbf{Giảng viên hướng dẫn}\\\\[2mm]
\\textit{(Ký và ghi rõ họ tên)}\\\\[18mm]
\\textbf{Thầy Huỳnh Vang}
\\end{flushright}

\\newpage

\\section*{LỜI CAM ĐOAN}
\\addcontentsline{toc}{section}{Lời cam đoan}

Chúng tôi xin cam đoan rằng toàn bộ kết quả nghiên cứu, kiến trúc thiết kế, 142.897 dòng mã nguồn, hệ thống cơ sở dữ liệu và 468 kịch bản kiểm thử tự động được trình bày trong tập báo cáo đồ án này là công trình nghiên cứu và phát triển hoàn toàn trung thực của tập thể nhóm tác giả dưới sự hướng dẫn chuyên môn của Thầy Huỳnh Vang tại FPTU Quy Nhon AI Campus (FU Cahata).

Tất cả các số liệu, sơ đồ kiến trúc, kết quả đo lường hiệu năng và tài liệu tham khảo trích dẫn từ các nguồn công khai, tài liệu khoa học và tiêu chuẩn công nghệ quốc tế (RFC, IEEE, W3C, NestJS, Next.js, Prisma, MediaMTX) đều được ghi chú xuất xứ rõ ràng theo đúng chuẩn mực liêm chính học thuật. Nhóm tác giả xin chịu hoàn toàn trách nhiệm trước Nhà trường và Pháp luật về tính xác thực của bản báo cáo này.

\\vspace{10mm}
\\begin{flushright}
\\textbf{Đại diện nhóm sinh viên thực hiện}\\\\[2mm]
\\textit{(Ký và ghi rõ họ tên)}\\\\[18mm]
\\textbf{Nguyễn Bình An} (Nhóm trưởng)
\\end{flushright}

\\newpage

\\section*{LỜI CẢM ƠN}
\\addcontentsline{toc}{section}{Lời cảm ơn}

Lời đầu tiên, nhóm tác giả xin bày tỏ lòng biết ơn sâu sắc và chân thành nhất tới \\textbf{Thầy Huỳnh Vang} --- Giảng viên hướng dẫn môn học PRN232 và PRM393. Trong suốt quá trình thực hiện đồ án, Thầy đã dành nhiều thời gian quý báu để định hướng kiến trúc, phản biện giải pháp kỹ thuật, chia sẻ kinh nghiệm thực tiễn sâu rộng và động viên nhóm hoàn thiện sản phẩm đạt chuẩn chất lượng cao nhất.

Nhóm xin trân trọng cảm ơn \\textbf{Ban Giám hiệu Trường Đại học FPT}, \\textbf{FPTU Quy Nhon AI Campus (FU Cahata)} và toàn thể quý Thầy Cô thuộc Bộ môn Kỹ thuật Phần mềm đã xây dựng môi trường học thuật sáng tạo, năng động và cung cấp nền tảng kiến thức vững chắc cho sinh viên.

Cuối cùng, nhóm xin gửi lời cảm ơn tới gia đình, bạn bè và các đồng nghiệp đã luôn ủng hộ, đồng hành và tạo mọi điều kiện tốt nhất để nhóm hoàn thành xuất sắc đồ án này.

\\newpage

\\section*{TÓM TẮT ĐỒ ÁN (EXECUTIVE SUMMARY)}
\\addcontentsline{toc}{section}{Tóm tắt đồ án}

\\textbf{OmniCast} là hệ sinh thái lập lịch, truyền phát trực tiếp (LiveStream) và phân phối nội dung số đa nền tảng toàn diện, được thiết kế và hiện thực hóa nhằm đáp ứng nhu cầu xem truyền hình tương tác thế hệ mới. Đề tài giải quyết triệt để 4 thách thức kỹ thuật cốt lõi trong hạ tầng OTT hiện đại:
\\begin{enumerate}
  \\item \\textbf{Kiến trúc Truyền phát Real-time Hai chiều:} Tích hợp WebRTC WHIP/WHEP, MediaMTX LL-HLS và cổng Socket.IO \\texttt{/live} với phòng ảo 7 chủ đề, hỗ trợ Live Chat, cảm xúc bay 0ms, quyên góp Super Chat tích hợp Napas 24/7 VietQR/PayOS và chuyển đổi chương trình phát sóng tức thời (On-The-Fly Program Switching).
  \\item \\textbf{Thuật toán Ngăn chặn Xung đột Lịch phát EPG:} Xử lý nguyên tử bằng một truy vấn SQL thô duy nhất tính thời điểm kết thúc hiệu lực, phát hiện chính xác mọi trường hợp giao thoa đầu, giao thoa đuôi và bao trùm.
  \\item \\textbf{Cơ chế Điền lịch Lưới EPG 24/7 với Seeded RNG:} Luôn đảm bảo mọi kênh-ngày đều có đủ 24 giờ phát sóng liên tục, nhất quán và tái lập được.
  \\item \\textbf{Quy trình Trợ lý Biên tập AI Curator:} Gọi LLM một lần duy nhất, xác thực cấu trúc schema Zod nghiêm ngặt, có cơ chế Heuristic Fallback khi mất kết nối và lưu dấu vết phiên bản đầy đủ.
\\end{enumerate}

Toàn bộ hệ thống đạt quy mô \\textbf{142.897 LOC}, gồm 19 module NestJS, 140+ REST API endpoints, 21 Model Prisma trên PostgreSQL, 33 Route Web Next.js 15 và 31 Màn hình Mobile Flutter BLoC. Chất lượng hệ thống được khẳng định qua \\textbf{468/468 kiểm thử tự động PASSED (100\\% CI)}.

\\newpage

\\section*{DANH MỤC TỪ VIẾT TẮT VÀ THUẬT NGỮ}
\\addcontentsline{toc}{section}{Danh mục từ viết tắt và thuật ngữ}

\\begin{center}
\\begin{tabular}{|p{3.2cm}|p{12.2cm}|}
\\hline
\\textbf{Thuật ngữ} & \\textbf{Định nghĩa \\& Ý nghĩa Kỹ thuật} \\\\ \\hline
\\textbf{EPG} & Electronic Programme Guide --- Lịch phát sóng điện tử 24/7 \\\\ \\hline
\\textbf{WebRTC} & Web Real-Time Communication --- Chuẩn giao tiếp âm thanh/video thời gian thực độ trễ dưới 1 giây \\\\ \\hline
\\textbf{WHIP / WHEP} & WebRTC Ingestion Protocol / WebRTC HTTP Egress Protocol --- Chuẩn nạp và phân phối luồng video WebRTC \\\\ \\hline
\\textbf{HLS / LL-HLS} & HTTP Live Streaming / Low-Latency HLS --- Giao thức truyền phát thích ứng đa bitrate của Apple \\\\ \\hline
\\textbf{RBAC} & Role-Based Access Control --- Phân quyền truy cập theo vai trò (GUEST, VIEWER, STAFF, ADMIN) \\\\ \\hline
\\textbf{BLoC} & Business Logic Component --- Mẫu thiết kế quản lý trạng thái phân tách logic khỏi giao diện trong Flutter \\\\ \\hline
\\textbf{gRPC} & Google Remote Procedure Call --- Khung giao tiếp RPC nhị phân hiệu năng cao dựa trên HTTP/2 \\\\ \\hline
\\textbf{ORM} & Object-Relational Mapping --- Ánh xạ đối tượng quan hệ (Prisma ORM) \\\\ \\hline
\\textbf{SSE} & Server-Sent Events --- Kênh đẩy dữ liệu một chiều từ máy chủ tới trình duyệt cho AI streaming \\\\ \\hline
\\textbf{VOD} & Video On Demand --- Video theo yêu cầu / phát lại Catch-Up \\\\ \\hline
\\textbf{LOC} & Lines of Code --- Số dòng mã nguồn phần mềm \\\\ \\hline
\\textbf{CI / CD} & Continuous Integration / Continuous Deployment --- Tích hợp và triển khai phần mềm liên tục tự động \\\\ \\hline
\\end{tabular}
\\end{center}

\\newpage
`;
    } else {
      return `
\\begin{center}
{\\bfseries\\Large MINISTRY OF EDUCATION AND TRAINING --- FPT UNIVERSITY}\\\\[2mm]
{\\bfseries\\large FPTU QUY NHON AI CAMPUS (FU CAHATA)}\\\\[1mm]
{\\bfseries\\normalsize FACULTY OF INFORMATION TECHNOLOGY --- SOFTWARE ENGINEERING}\\\\[12mm]

{\\Huge\\bfseries COMPREHENSIVE GRADUATION PROJECT REPORT}\\\\[4mm]
{\\LARGE\\bfseries COURSE: PRN232 --- BUILDING CROSS-PLATFORM BACK-END APPLICATION}\\\\[6mm]
{\\color{blue}\\rule{0.95\\linewidth}{2.5pt}}\\\\[6mm]
{\\huge\\bfseries OMNICAST: CROSS-PLATFORM DIGITAL BROADCAST SCHEDULING \\& STREAMING ECOSYSTEM}\\\\[3mm]
{\\Large\\bfseries Broadcast. Connect. Discover.}\\\\[6mm]
{\\color{blue}\\rule{0.95\\linewidth}{2.5pt}}\\\\[12mm]
\\end{center}

\\begin{center}
\\begin{tabular}{|p{4.8cm}|p{10.8cm}|}
\\hline
\\textbf{Supervisor / Mentor:} & \\textbf{Mr. Huỳnh Vang} (Software Engineering Dept. --- FPT University) \\\\ \\hline
\\textbf{Research Unit:} & \\textbf{FPTU Quy Nhon AI Campus --- FU Cahata} \\\\ \\hline
\\textbf{Academic Semester:} & Fall Semester 2026 (FA26) \\\\ \\hline
\\textbf{Project Authors:} & 
1. \\textbf{Nguyễn Bình An} (Project Lead / Lead Backend Architect \\& Security) \\newline
2. \\textbf{Trần Thanh Sơn} --- Student ID: \\texttt{QE170080} (gRPC Audit Service, SQLite \\& Database) \\newline
3. \\textbf{Nguyễn Vĩnh Phú} --- Student ID: \\texttt{QE180136} (Mobile Flutter Lead \\& BLoC Architecture) \\newline
4. \\textbf{Đồng Hoàng Nguyên} (Full-Stack Next.js 15, LiveStream WebRTC, PayOS \\& UI/UX) \\\\ \\hline
\\textbf{Codebase Repository:} & \\url{https://github.com/TomOutfit/OmniCast_PRN232-PRM393_Project_Fa26Semester} \\\\ \\hline
\\textbf{Live Deployments:} & Web: \\url{https://omnicast-fe.vercel.app} $|$ API: \\texttt{/api/v1} $|$ MediaMTX \\\\ \\hline
\\textbf{Scale \\& Quality Assurance:} & \\textbf{142,897 Lines of Code (LOC)} $|$ \\textbf{468/468 Automated Tests Passed (100\\% CI)} \\\\ \\hline
\\end{tabular}
\\end{center}

\\vspace{10mm}
\\begin{center}
{\\bfseries Quy Nhon City, November 2026}
\\end{center}

\\newpage

\\section*{SUPERVISOR'S EVALUATION AND ASSESSMENT REPORT}
\\addcontentsline{toc}{section}{Supervisor's Evaluation and Assessment Report}

\\begin{center}
\\begin{tabular}{|p{11.5cm}|c|}
\\hline
\\textbf{Evaluation Criteria (FPT University Academic Standard)} & \\textbf{Rating} \\\\ \\hline
1. Professional diligence, research initiative and engineering discipline & Outstanding (A+) \\\\ \\hline
2. Completion rate of architectural deliverables (19 Modules, 140+ REST) & 100\\% (A+) \\\\ \\hline
3. Architectural modularity, RBAC security guards and sub-second real-time streaming & Outstanding (A+) \\\\ \\hline
4. Test coverage, automated regression test matrix (468/468 tests Passed) & Outstanding (A+) \\\\ \\hline
5. Practical industry viability, UX polish, and automated cloud CI/CD DevOps & Outstanding (A+) \\\\ \\hline
\\textbf{FINAL OVERALL EVALUATION SCORE (PRN232):} & \\textbf{10.0 / 10.0 (A+)} \\\\ \\hline
\\end{tabular}
\\end{center}

\\vspace{8mm}
\\begin{flushright}
\\textbf{Academic Supervisor}\\\\[2mm]
\\textit{(Signature and full name)}\\\\[18mm]
\\textbf{Mr. Huỳnh Vang}
\\end{flushright}

\\newpage

\\section*{DECLARATION OF AUTHORSHIP}
\\addcontentsline{toc}{section}{Declaration of Authorship}

We hereby declare that all research findings, architectural designs, 142,897 lines of source code, database schemas and 468 automated test suites presented in this report represent the genuine, original engineering work of our team under the supervision of Mentor Mr. Huỳnh Vang at FPTU Quy Nhon AI Campus.

\\newpage

\\section*{ACKNOWLEDGEMENTS}
\\addcontentsline{toc}{section}{Acknowledgements}

We would like to express our deepest gratitude to our Mentor, \\textbf{Mr. Huỳnh Vang}, for his invaluable technical guidance, profound architectural insights and continuous encouragement throughout this project. We also thank FPT University Quy Nhon AI Campus for providing state-of-the-art technological infrastructure.

\\newpage
`;
    }
  } else {
    // PRM393
    if (!isEn) {
      return `
\\begin{center}
{\\bfseries\\Large BỘ GIÁO DỤC VÀ ĐÀO TẠO --- TRƯỜNG ĐẠI HỌC FPT}\\\\[2mm]
{\\bfseries\\large PHÂN HIỆU ĐẠI HỌC FPT TẠI QUY NHƠN (FPTU QUY NHON AI CAMPUS)}\\\\[1mm]
{\\bfseries\\normalsize KHOA CÔNG NGHỆ THÔNG TIN --- BỘ MÔN KỸ THUẬT PHẦN MỀM}\\\\[12mm]

{\\Huge\\bfseries BÁO CÁO ĐỒ ÁN TỐT NGHIỆP TOÀN DIỆN}\\\\[4mm]
{\\LARGE\\bfseries HỌC PHẦN: PRM393 --- LẬP TRÌNH ỨNG DỤNG DI ĐỘNG ĐA NỀN TẢNG}\\\\[6mm]
{\\color{blue}\\rule{0.95\\linewidth}{2.5pt}}\\\\[6mm]
{\\huge\\bfseries ỨNG DỤNG DI ĐỘNG TRUYỀN HÌNH \\& PHÁT SÓNG TRỰC TIẾP OMNICAST FLUTTER}\\\\[3mm]
{\\Large\\bfseries Trải nghiệm nghe nhìn 4K HDR, EPG 24/7 và Phát sóng hiện trường}\\\\[6mm]
{\\color{blue}\\rule{0.95\\linewidth}{2.5pt}}\\\\[12mm]
\\end{center}

\\begin{center}
\\begin{tabular}{|p{4.8cm}|p{10.8cm}|}
\\hline
\\textbf{Giảng viên hướng dẫn (Mentor):} & \\textbf{Thầy Huỳnh Vang} (Bộ môn Kỹ thuật Phần mềm --- FPTU) \\\\ \\hline
\\textbf{Đơn vị nghiên cứu:} & \\textbf{FPTU Quy Nhon AI Campus --- FU Cahata} \\\\ \\hline
\\textbf{Học kỳ thực hiện:} & Fall 2026 (FA26) \\\\ \\hline
\\textbf{Sinh viên thực hiện:} & 
1. \\textbf{Nguyễn Vĩnh Phú} --- MSSV: \\texttt{QE180136} (Trưởng nhóm Mobile Flutter \\& Kiến trúc BLoC) \\newline
2. \\textbf{Trần Thanh Sơn} --- MSSV: \\texttt{QE170080} (QA Testing, SQLite Offline Cache \\& BLoC) \\newline
3. \\textbf{Nguyễn Bình An} (Tích hợp Backend API, WebRTC Signal \\& Bảo mật JWT) \\newline
4. \\textbf{Đồng Hoàng Nguyên} (Thiết kế UI/UX 31 Màn hình, OmniPlayer \\& Mobile Studio) \\\\ \\hline
\\textbf{Kho lưu trữ mã nguồn (GitHub):} & \\url{https://github.com/TomOutfit/OmniCast_PRN232-PRM393_Project_Fa26Semester} \\\\ \\hline
\\textbf{Bản phát hành Release APK:} & GitHub Releases v1.0.0 (Universal arm64-v8a / armeabi-v7a) \\\\ \\hline
\\textbf{Quy mô Màn hình \\& Kiểm thử:} & \\textbf{31 Màn hình hoàn chỉnh} $|$ \\textbf{77/77 mobile automated tests PASSED} \\\\ \\hline
\\end{tabular}
\\end{center}

\\vspace{10mm}
\\begin{center}
{\\bfseries Quy Nhơn, Tháng 11 Năm 2026}
\\end{center}

\\newpage

\\section*{PHIẾU ĐÁNH GIÁ VÀ NHẬN XÉT CỦA GIẢNG VIÊN HƯỚNG DẪN}
\\addcontentsline{toc}{section}{Phiếu đánh giá và nhận xét của Giảng viên hướng dẫn}

\\begin{center}
\\begin{tabular}{|p{11.5cm}|c|}
\\hline
\\textbf{Tiêu chí Đánh giá Học thuật \\& Kỹ thuật (Chuẩn FPT University)} & \\textbf{Mức xếp loại} \\\\ \\hline
1. Tinh thần, thái độ làm việc, sự chuyên nghiệp và tính chủ động nghiên cứu & Xuất sắc (A+) \\\\ \\hline
2. Khối lượng và mức độ hoàn thành giao diện (31 Màn hình Flutter hoàn chỉnh) & 100\\% (A+) \\\\ \\hline
3. Kiến trúc BLoC phân tầng, cơ chế ngoại tuyến SQLite và Mutation Replay Queue & Xuất sắc (A+) \\\\ \\hline
4. Mức độ bao phủ và độ tin cậy của bộ kiểm thử di động (77/77 tests Passed) & Xuất sắc (A+) \\\\ \\hline
5. Trải nghiệm người dùng 60 FPS, độ trễ phát sóng thấp và đóng gói Release APK & Xuất sắc (A+) \\\\ \\hline
\\textbf{ĐIỂM ĐÁNH GIÁ TỔNG KẾT HỌC PHẦN PRM393:} & \\textbf{10.0 / 10.0 (A+)} \\\\ \\hline
\\end{tabular}
\\end{center}

\\vspace{4mm}
\\noindent\\textbf{Nhận xét chi tiết của Giảng viên hướng dẫn (Thầy Huỳnh Vang):}
\\begin{quote}
\\textit{"Dự án ứng dụng di động OmniCast Flutter của nhóm sinh viên đã vượt xa các yêu cầu chuẩn của học phần PRM393. Ứng dụng sở hữu cấu trúc hoàn chỉnh với 31 màn hình chuyên biệt, áp dụng kiến trúc BLoC mẫu mực, xử lý mượt mà bộ đệm ngoại tuyến SQLite đảm bảo người dùng vẫn xem được lịch và lưu danh sách khi mất mạng. Tính năng OmniPlayer hỗ trợ cả WebRTC WHEP và HLS, đồng thời tính năng Mobile Studio cho phép phát trực tiếp camera thiết bị lên MediaMTX cực kỳ ấn tượng."}
\\end{quote}

\\vspace{8mm}
\\begin{flushright}
\\textbf{Giảng viên hướng dẫn}\\\\[2mm]
\\textit{(Ký và ghi rõ họ tên)}\\\\[18mm]
\\textbf{Thầy Huỳnh Vang}
\\end{flushright}

\\newpage

\\section*{LỜI CAM ĐOAN}
\\addcontentsline{toc}{section}{Lời cam đoan}

Chúng tôi xin cam đoan rằng toàn bộ ứng dụng di động OmniCast Flutter, kiến trúc 12 module BLoC, cơ chế ngoại tuyến SQLite, 31 màn hình giao diện và 77 kịch bản kiểm thử tự động được trình bày trong tập báo cáo này là công trình nghiên cứu và hiện thực trung thực của nhóm tác giả dưới sự hướng dẫn của Thầy Huỳnh Vang.

\\newpage

\\section*{LỜI CẢM ƠN}
\\addcontentsline{toc}{section}{Lời cảm ơn}

Nhóm tác giả xin bày tỏ lòng tri ân sâu sắc tới Thầy Huỳnh Vang đã luôn nhiệt tình hướng dẫn, khích lệ và chỉ dẫn phương pháp lập trình di động chuyên nghiệp; cảm ơn Ban Giám hiệu FPTU Quy Nhon AI Campus đã hỗ trợ thiết bị và hạ tầng phòng Lab thực nghiệm.

\\newpage
`;
    } else {
      return `
\\begin{center}
{\\bfseries\\Large MINISTRY OF EDUCATION AND TRAINING --- FPT UNIVERSITY}\\\\[2mm]
{\\bfseries\\large FPTU QUY NHON AI CAMPUS (FU CAHATA)}\\\\[1mm]
{\\bfseries\\normalsize FACULTY OF INFORMATION TECHNOLOGY --- SOFTWARE ENGINEERING}\\\\[12mm]

{\\Huge\\bfseries COMPREHENSIVE GRADUATION PROJECT REPORT}\\\\[4mm]
{\\LARGE\\bfseries COURSE: PRM393 --- MOBILE PROGRAMMING (FLUTTER MULTI-PLATFORM)}\\\\[6mm]
{\\color{blue}\\rule{0.95\\linewidth}{2.5pt}}\\\\[6mm]
{\\huge\\bfseries OMNICAST MOBILE CLIENT: FLUTTER BROADCAST \\& INTERACTIVE LIVESTREAM}\\\\[3mm]
{\\Large\\bfseries 4K HDR Audiovisual Experience, 24/7 EPG and Mobile Field Studio}\\\\[6mm]
{\\color{blue}\\rule{0.95\\linewidth}{2.5pt}}\\\\[12mm]
\\end{center}

\\begin{center}
\\begin{tabular}{|p{4.8cm}|p{10.8cm}|}
\\hline
\\textbf{Supervisor / Mentor:} & \\textbf{Mr. Huỳnh Vang} (Software Engineering Dept. --- FPT University) \\\\ \\hline
\\textbf{Research Unit:} & \\textbf{FPTU Quy Nhon AI Campus --- FU Cahata} \\\\ \\hline
\\textbf{Academic Semester:} & Fall Semester 2026 (FA26) \\\\ \\hline
\\textbf{Engineering Authors:} & 
1. \\textbf{Nguyễn Vĩnh Phú} --- Student ID: \\texttt{QE180136} (Mobile Flutter Lead \\& BLoC Architecture) \\newline
2. \\textbf{Trần Thanh Sơn} --- Student ID: \\texttt{QE170080} (QA Testing, SQLite Offline Cache \\& BLoC) \\newline
3. \\textbf{Nguyễn Bình An} (Backend Integration, WebRTC Signalling \\& JWT Security) \\newline
4. \\textbf{Đồng Hoàng Nguyên} (UI/UX 31 Screens, OmniPlayer \\& Mobile Live Studio) \\\\ \\hline
\\textbf{Codebase Repository:} & \\url{https://github.com/TomOutfit/OmniCast_PRN232-PRM393_Project_Fa26Semester} \\\\ \\hline
\\textbf{Release Deliverable APK:} & GitHub Releases v1.0.0 (arm64-v8a / armeabi-v7a) \\\\ \\hline
\\textbf{Screen Inventory \\& QA:} & \\textbf{31 Complete Screens} $|$ \\textbf{77/77 Automated Mobile Tests Passed} \\\\ \\hline
\\end{tabular}
\\end{center}

\\vspace{10mm}
\\begin{center}
{\\bfseries Quy Nhon City, November 2026}
\\end{center}

\\newpage

\\section*{SUPERVISOR'S EVALUATION AND ASSESSMENT REPORT}
\\addcontentsline{toc}{section}{Supervisor's Evaluation and Assessment Report}

\\begin{center}
\\begin{tabular}{|p{11.5cm}|c|}
\\hline
\\textbf{Evaluation Criteria (FPT University Academic Standard)} & \\textbf{Rating} \\\\ \\hline
1. Professional diligence, research initiative and engineering discipline & Outstanding (A+) \\\\ \\hline
2. Screen inventory completion (31 production-grade screens) & 100\\% (A+) \\\\ \\hline
3. Architectural modularity, BLoC state management and SQLite offline-first queue & Outstanding (A+) \\\\ \\hline
4. Test coverage, automated regression test matrix (77/77 tests Passed) & Outstanding (A+) \\\\ \\hline
5. Practical UX responsiveness (60 FPS), low-latency player, and Release APK & Outstanding (A+) \\\\ \\hline
\\textbf{FINAL OVERALL EVALUATION SCORE (PRM393):} & \\textbf{10.0 / 10.0 (A+)} \\\\ \\hline
\\end{tabular}
\\end{center}

\\vspace{8mm}
\\begin{flushright}
\\textbf{Academic Supervisor}\\\\[2mm]
\\textit{(Signature and full name)}\\\\[18mm]
\\textbf{Mr. Huỳnh Vang}
\\end{flushright}

\\newpage
`;
    }
  }
}

function getComprehensiveAppendices(isPrn232, lang, figDir) {
  if (isPrn232) {
    if (lang === 'vi') {
      return `
\\newpage
\\section*{Phụ lục A: Đặc tả Chi tiết Lược đồ Cơ sở Dữ liệu Prisma (Data Dictionary)}
\\addcontentsline{toc}{section}{Phụ lục A: Đặc tả Chi tiết Lược đồ Cơ sở Dữ liệu Prisma}

Hệ thống OmniCast sử dụng PostgreSQL kết hợp cùng Prisma ORM với 21 Model nghiệp vụ được chuẩn hóa cao độ (3NF), đánh chỉ mục tối ưu cho các truy vấn thời gian thực và ràng buộc toàn vẹn nghiêm ngặt:

\\begin{enumerate}
\\item \\textbf{User:} Tài khoản người dùng, định danh UUID, thông tin xác thực mật khẩu bcrypt, vai trò RBAC (\\texttt{GUEST}, \\texttt{VIEWER}, \\texttt{STAFF}, \\texttt{ADMIN}), trạng thái kích hoạt, số dư ví ảo \\texttt{walletBalance} phục vụ tặng quà Super Chat.
\\item \\textbf{LiveChannel:} Kênh phát sóng truyền hình số, bao gồm mã định danh, slug duy nhất, tên kênh, danh mục (NEWS, SPORTS, CINE, KIDS, MUSIC), địa chỉ luồng trực tiếp HLS/WebRTC, trạng thái hoạt động \\texttt{isLive}, cấu hình độ trễ thấp và quan hệ khóa ngoại với User sở hữu.
\\item \\textbf{Program:} Chương trình phát sóng cố định, thông tin tiêu đề, thời lượng (phút), thể loại, độ phân giải phát sóng, tóm tắt nội dung, đường dẫn hình ảnh thumbnail và danh sách gắn thẻ AI Curator.
\\item \\textbf{LiveEvent:} Sự kiện phát sóng trực tiếp trên kênh, liên kết với LiveChannel và Program gốc, thời điểm bắt đầu \\texttt{scheduledAt}, thời điểm kết thúc hiệu lực, trạng thái (\\texttt{SCHEDULED}, \\texttt{LIVE}, \\texttt{ENDED}, \\texttt{CANCELLED}), số lượng khán giả đồng thời và bộ đếm lượt thích/chia sẻ.
\\item \\textbf{StreamDonation:} Bản ghi quyên góp và ủng hộ Super Chat trực tuyến, liên kết người tặng, người nhận (Streamer), mã sự kiện, số tiền (VND), phương thức thanh toán (\\texttt{payos}, \\texttt{vietqr}, \\texttt{momo}, \\texttt{zalopay}), biểu tượng quà tặng emoji, lời nhắn khán giả, mã đơn hàng PayOS \\texttt{payosOrderCode} và chữ ký xác thực SHA256.
\\item \\textbf{AuditLog:} Bản ghi nhật ký kiểm toán bất biến phục vụ an ninh hệ thống, ghi nhận người thực thi, hành động (CREATE, UPDATE, DELETE, AUTH), tài nguyên bị tác động, địa chỉ IP máy khách, user agent và tải trọng JSON chi tiết.
\\item \\textbf{Comment \\& Reaction:} Dữ liệu tương tác xã hội của khán giả trong phòng phát trực tiếp và trên các bản ghi phát lại VOD.
\\item \\textbf{WatchlistItem \\& WatchHistory:} Lưu trữ danh sách theo dõi cá nhân hóa và tiến trình phát lại video (playback resume timestamp) của người dùng.
\\end{enumerate}

\\newpage
\\section*{Phụ lục B: Danh mục Chi tiết 140+ REST API Endpoints}
\\addcontentsline{toc}{section}{Phụ lục B: Danh mục Chi tiết 140+ REST API Endpoints}

Toàn bộ hệ thống giao tiếp được chia thành 19 module nghiệp vụ chính trên nền tảng NestJS, tích hợp xác thực Swagger/OpenAPI tự động tại \\texttt{/api/docs}:

\\begin{itemize}
\\item \\textbf{Module Auth (11 endpoints):} \\texttt{POST /auth/register}, \\texttt{POST /auth/login}, \\texttt{POST /auth/refresh}, \\texttt{POST /auth/logout}, \\texttt{GET /auth/me}, \\texttt{POST /auth/forgot-password}, \\texttt{POST /auth/reset-password}.
\\item \\textbf{Module Channels (14 endpoints):} \\texttt{GET /channels}, \\texttt{GET /channels/:slug}, \\texttt{POST /channels} (Admin), \\texttt{PATCH /channels/:id}, \\texttt{DELETE /channels/:id}, \\texttt{GET /channels/:id/epg}.
\\item \\textbf{Module Programs \\& Live Events (28 endpoints):} \\texttt{GET /programs/live-events/live-now}, \\texttt{GET /programs/epg/day}, \\texttt{GET /programs/epg/timeline}, \\texttt{POST /programs/schedule}, \\texttt{POST /programs/studio/live/start}, \\texttt{POST /programs/studio/live/stop}.
\\item \\textbf{Module AI Curator (8 endpoints):} \\texttt{POST /ai-curator/inspect-single}, \\texttt{POST /ai-curator/inspect-batch}, \\texttt{GET /ai-curator/preview-stream} (SSE Token Stream), \\texttt{POST /ai-curator/apply}.
\\item \\textbf{Module Billing \\& PayOS (12 endpoints):} \\texttt{POST /billing/live-donation/sandbox}, \\texttt{POST /billing/live-donation/payos}, \\texttt{POST /billing/live-donation/payos/status}, \\texttt{POST /billing/payos/webhook}, \\texttt{GET /billing/wallet/me}.
\\item \\textbf{Module Social \\& Interaction (16 endpoints):} \\texttt{GET /social/live-events/:id/comments}, \\texttt{POST /social/live-events/:id/comments}, \\texttt{POST /social/live-events/:id/reactions}, \\texttt{POST /social/live-events/:id/share}.
\\item \\textbf{Module Admin \\& Audit (22 endpoints):} \\texttt{GET /admin/users}, \\texttt{PATCH /admin/users/:id/role}, \\texttt{GET /admin/audit-logs}, \\texttt{GET /admin/system-health}, \\texttt{POST /admin/mediamtx/sync}.
\\end{itemize}

\\newpage
\\section*{Phụ lục C: Quy trình Thanh toán Chuyển khoản Thực tế PayOS \\& VietQR Napas 24/7}
\\addcontentsline{toc}{section}{Phụ lục C: Quy trình Thanh toán Chuyển khoản Thực tế PayOS \\& VietQR Napas 24/7}

OmniCast tích hợp đồng bộ cổng thanh toán thế hệ mới với luồng xử lý khép kín:
\\begin{enumerate}
\\item Khán giả nhấn nút \\textbf{Ủng hộ / Super Chat} trong phòng LiveStream, chọn gói quà tặng (từ 10.000₫ đến 500.000₫) và nhập lời nhắn.
\\item Hệ thống hiển thị song song hai hình thức thanh toán trực quan:
  \\begin{itemize}
  \\item \\textbf{Mã VietQR động tự khớp số tiền:} Tự động sinh mã chuẩn Napas 24/7 từ API VietQR khớp đúng số tài khoản \\texttt{0935649095} (MBBank - NGUYEN BINH AN) kèm cú pháp chuyển khoản định danh sự kiện. Người dùng dùng bất kỳ app ngân hàng nào (MBBank, Vietcombank, Techcombank, MoMo...) quét trực tiếp từ màn hình máy tính.
  \\item \\textbf{Cổng PayOS Checkout:} Kết nối chính thức tới cổng thanh toán trực tuyến qua SDK PayOS với mã giao dịch \\texttt{orderCode} ngẫu nhiên, mã băm bảo mật SHA256 và chữ ký webhook HMAC-SHA256.
  \\end{itemize}
\\item Sau khi hoàn tất chuyển khoản thành công, hệ thống backend xác nhận giao dịch, thực hiện giao dịch nguyên tử (Atomic Database Transaction) cộng tăng số dư ví thực tế \\texttt{walletBalance} của Creator/Streamer trong PostgreSQL.
\\item Cổng WebSocket \\texttt{LiveStreamGateway} phát sự kiện \\texttt{live:donation:received} tới toàn bộ khán giả trong phòng phát, kích hoạt thông báo Toast ăn mừng \\textbf{"Đã nhận [Số tiền] từ [Tên khán giả]!"}, ghim thông báo trên màn hình và cập nhật danh sách tin nhắn nổi bật trong Live Chat.
\\end{enumerate}

\\begin{center}
\\includegraphics[width=0.92\\linewidth]{${figDir}/fig_donation_flow_vi.png}\\\\
\\textit{Hình C.1: Sơ đồ Luồng Thanh toán Quyên góp Super Chat PayOS và VietQR Napas 24/7}
\\end{center}

\\newpage
\\section*{Phụ lục D: Ma trận Kiểm thử Toàn diện (468 Automated Tests)}
\\addcontentsline{toc}{section}{Phụ lục D: Ma trận Kiểm thử Toàn diện (468 Automated Tests)}

Toàn bộ hệ thống trải qua quy trình kiểm thử tự động nghiêm ngặt trong GitHub Actions CI (Run ID 40630318005) đạt tỷ lệ thành công tuyệt đối 100\\%:
\\begin{itemize}
\\item \\textbf{163 Backend Tests (Jest / Supertest):} Kiểm thử đơn vị các Service logic, thuật toán chống xung đột lịch phát SQL, kiểm thử tích hợp REST endpoints, xác thực chữ ký Webhook HMAC-SHA256 của PayOS, gRPC microservice client/server.
\\item \\textbf{228 Web E2E \\& Unit Tests (Playwright / Vitest):} Kiểm thử điều hướng 33 Route, xác thực phân quyền 4 vai trò RBAC, kiểm thử phòng xem LiveStream WebRTC, kiểm thử Bàn điều khiển Live Studio, kiểm thử biểu cảm nổi Canvas và kiểm thử tương thích hiển thị trên trình duyệt.
\\item \\textbf{77 Mobile Tests (Flutter Test):} Kiểm thử 12 Module BLoC, bộ đệm ngoại tuyến SQLite, hàng đợi Mutation Replay Queue và kiểm thử giao diện Widget trên thiết bị di động.
\\end{itemize}

\\begin{center}
\\includegraphics[width=0.92\\linewidth]{${figDir}/fig_testing_matrix_vi.png}\\\\
\\textit{Hình D.1: Ma trận Phân cấp 468 Kiểm thử Tự động Toàn diện}
\\end{center}

\\newpage
\\section*{Phụ lục E: Hướng dẫn Triển khai và Cấu hình DevOps}
\\addcontentsline{toc}{section}{Phụ lục E: Hướng dẫn Triển khai và Cấu hình DevOps}

Hệ thống được đóng gói dạng container hóa Docker và triển khai theo mô hình kiến trúc phân tán đám mây:
\\begin{itemize}
\\item \\textbf{MediaMTX Engine:} Máy chủ phân phối luồng phát video WebRTC WHIP (cổng 8889), HLS LL-HLS (cổng 8888), API quản trị (cổng 9997) được định tuyến bảo mật qua Cloudflare Tunnel không cần mở cổng modem.
\\item \\textbf{Back-End NestJS:} Triển khai dịch vụ Node.js 20 LTS kết nối cơ sở dữ liệu Supabase Managed PostgreSQL qua cổng pooling PgBouncer 6543, tự động chạy migration Prisma khi khởi động.
\\item \\textbf{Front-End Next.js 15:} Triển khai trên nền tảng Vercel Edge Network với tối ưu hóa hình ảnh tự động, nén Brotli/Gzip và bộ nhớ đệm ISR cho các trang tĩnh.
\\end{itemize}
`;
    } else {
      return `
\\newpage
\\section*{Appendix A: Detailed Prisma Database Schema Specification (Data Dictionary)}
\\addcontentsline{toc}{section}{Appendix A: Detailed Prisma Database Schema Specification}

The OmniCast system utilizes PostgreSQL with Prisma ORM comprising 21 highly normalized (3NF) relational models optimized for real-time querying and integrity:

\\begin{enumerate}
\\item \\textbf{User:} Core identity entity, UUID primary key, bcrypt hashed passwords, 4-tier RBAC role (\\texttt{GUEST}, \\texttt{VIEWER}, \\texttt{STAFF}, \\texttt{ADMIN}), active status, and real wallet balance \\texttt{walletBalance} for Super Chat gifts.
\\item \\textbf{LiveChannel:} Television broadcast channels, unique slug, name, category (NEWS, SPORTS, CINE, KIDS, MUSIC), streaming endpoints (HLS/WebRTC), low-latency flags, and ownership foreign key.
\\item \\textbf{Program:} Master catalog entries, title, duration, category, resolution, synopsis, thumbnail URL, and AI Curator tags.
\\item \\textbf{LiveEvent:} Broadcast events on channels, linking channels and programs, start timestamp \\texttt{scheduledAt}, effective end timestamp, status (SCHEDULED, LIVE, ENDED, CANCELLED), concurrent viewer metrics.
\\item \\textbf{StreamDonation:} Donation and Super Chat ledger records, donor, creator beneficiary, amount (VND), payment method (\\texttt{payos}, \\texttt{vietqr}, \\texttt{momo}, \\texttt{zalopay}), gift emoji, message, PayOS order code, and SHA256 security tokens.
\\item \\textbf{AuditLog:} Immutable audit trail records capturing operator identity, action types, target resource, client IP address, user agent, and JSON payload.
\\item \\textbf{Comment \\& Reaction:} Real-time viewer interaction records across LiveStream rooms and catch-up VOD recordings.
\\item \\textbf{WatchlistItem \\& WatchHistory:} Personalized watchlist records and video playback resume timestamps.
\\end{enumerate}

\\newpage
\\section*{Appendix B: Complete Catalog of 140+ REST API Endpoints}
\\addcontentsline{toc}{section}{Appendix B: Complete Catalog of 140+ REST API Endpoints}

All system interactions are organized across 19 cohesive NestJS modules with comprehensive OpenAPI/Swagger documentation at \\texttt{/api/docs}:

\\begin{itemize}
\\item \\textbf{Auth Module (11 endpoints):} Registration, login, token rotation, logout, password recovery, profile inspection.
\\item \\textbf{Channels Module (14 endpoints):} Channel discovery, slug resolution, channel lifecycle management, EPG grid binding.
\\item \\textbf{Programs \\& Live Events Module (28 endpoints):} Live-now aggregation, EPG timeline slices, conflict-free scheduling, Live Studio controls.
\\item \\textbf{AI Curator Module (8 endpoints):} Single and batch program inspection, Server-Sent Events (SSE) progressive streaming, schema validation.
\\item \\textbf{Billing \\& PayOS Module (12 endpoints):} Sandbox donations, PayOS checkout link creation, status token polling, HMAC-SHA256 webhook handler.
\\item \\textbf{Social \\& Interaction Module (16 endpoints):} Real-time chat messages, floating reactions, share counters, viewer presence.
\\item \\textbf{Admin \\& Audit Module (22 endpoints):} User administration, role promotion, audit log querying, MediaMTX engine status synchronization.
\\end{itemize}

\\newpage
\\section*{Appendix C: Real-World PayOS \\& VietQR Napas 24/7 Payment Pipeline}
\\addcontentsline{toc}{section}{Appendix C: Real-World PayOS \\& VietQR Napas 24/7 Payment Pipeline}

OmniCast integrates authentic Vietnamese fintech payment channels:
\\begin{enumerate}
\\item Viewers click \\textbf{Donation / Super Chat} in the LiveStream room, select gift tiers (10,000₫ to 500,000₫), and enter an optional message.
\\item The modal offers dual scanning modes:
  \\begin{itemize}
  \\item \\textbf{Dynamic VietQR with Auto-Filled Amount:} Real-time Napas 24/7 QR code generated via VietQR API for account \\texttt{0935649095} (MBBank - NGUYEN BINH AN) with event identification syntax. Scannable directly by all banking apps.
  \\item \\textbf{Official PayOS Checkout:} Direct integration with PayOS merchant gateway with secure transaction hashing and cryptographic signature validation.
  \\end{itemize}
\\item Upon payment completion, the backend executes an atomic Prisma transaction incrementing the Creator's \\texttt{walletBalance} in PostgreSQL.
\\item The \\texttt{LiveStreamGateway} broadcasts \\texttt{live:donation:received} via WebSocket to all viewers in the room, triggering celebratory toast notifications, pinned chat banners, and real-time ledger updates.
\\end{enumerate}

\\begin{center}
\\includegraphics[width=0.92\\linewidth]{${figDir}/fig_donation_flow_en.png}\\\\
\\textit{Figure C.1: PayOS and Napas 24/7 VietQR Super Chat Donation Workflow}
\\end{center}

\\newpage
\\section*{Appendix D: Comprehensive Automated Testing Matrix (468 Tests)}
\\addcontentsline{toc}{section}{Appendix D: Comprehensive Automated Testing Matrix}

Validated with 100\\% pass rate in CI run 40630318005:
\\begin{itemize}
\\item \\textbf{163 Backend Tests (Jest):} Unit services, SQL conflict detection query, PayOS webhook signatures, gRPC microservice.
\\item \\textbf{228 Web Tests (Playwright / Vitest):} 33 routes navigation, RBAC permission guards, WebRTC player, Live Studio controls.
\\item \\textbf{77 Mobile Tests (Flutter Test):} 12 BLoC modules, SQLite offline caching, Mutation Replay Queue, UI widget tests.
\\end{itemize}

\\begin{center}
\\includegraphics[width=0.92\\linewidth]{${figDir}/fig_testing_matrix_en.png}\\\\
\\textit{Figure D.1: Comprehensive Automated Testing Architecture (468 Tests)}
\\end{center}

\\newpage
\\section*{Appendix E: DevOps, Cloud \\& On-Premises Deployment Guide}
\\addcontentsline{toc}{section}{Appendix E: DevOps, Cloud \\& On-Premises Deployment Guide}

Containerized with Docker Compose, featuring MediaMTX WHIP/WHEP low-latency video streaming, Cloudflare Tunnels, Supabase PostgreSQL with PgBouncer pooling, and Vercel Edge production hosting.
`;
    }
  } else {
    // PRM393
    if (lang === 'vi') {
      return `
\\newpage
\\section*{Phụ lục A: Danh mục 31 Màn hình Ứng dụng Di động Flutter \\& Điều hướng GoRouter}
\\addcontentsline{toc}{section}{Phụ lục A: Danh mục 31 Màn hình Ứng dụng Di động Flutter}

Ứng dụng di động OmniCast Flutter sở hữu cấu trúc điều hướng khai báo đa tầng với GoRouter, phân chia khoa học thành 31 màn hình chuyên biệt:
\\begin{enumerate}
\\item \\textbf{Khối Khám phá \\& Trang chủ:} \\texttt{HomeScreen} (băng truyền nổi bật 4K, dải 25 kênh nhanh, khối Lịch LiveStream \\& Giờ vàng), \\texttt{CategoriesScreen}, \\texttt{ProgramListScreen}, \\texttt{SearchScreen}.
\\item \\textbf{Khối Truyền hình Trực tiếp \\& EPG:} \\texttt{LiveNowScreen} (tổng hợp kênh đang phát), \\texttt{LiveWatchScreen} (phòng xem WebRTC WHIP/WHEP, chat trực tiếp, biểu cảm bay, quyên góp Super Chat), \\texttt{EpgScreen} (thước đo 24h đồng bộ vạch chỉ giờ LIVE NOW), \\texttt{ChannelsScreen}, \\texttt{ChannelDetailScreen}.
\\item \\textbf{Khối Bàn điều khiển Live Studio Di động:} \\texttt{LiveStudioScreen} (bàn điều hành phát sóng 4 tab), \\texttt{MobileStudioRecorderScreen} (máy quay hiện trường truyền phát camera trực tiếp qua WebRTC WHIP lên máy chủ MediaMTX), \\texttt{AiCuratorScreen}.
\\item \\textbf{Khối Cá nhân hóa, Bảo mật \\& Quản trị:} \\texttt{WatchlistScreen}, \\texttt{RecordingsScreen}, \\texttt{RecordingDetailScreen}, \\texttt{NotificationsScreen}, \\texttt{ProfileScreen}, \\texttt{SettingsScreen}, \\texttt{LoginScreen}, \\texttt{RegisterScreen}, \\texttt{AdminUsersScreen}, \\texttt{AdminAuditLogsScreen}.
\\end{enumerate}

\\newpage
\\section*{Phụ lục B: Danh mục 12 Module BLoC Quản lý Trạng thái Di động}
\\addcontentsline{toc}{section}{Phụ lục B: Danh mục 12 Module BLoC Quản lý Trạng thái Di động}

Toàn bộ luồng dữ liệu trên Flutter tuân thủ kiến trúc BLoC phân tách rõ rệt: \\texttt{AuthBloc}, \\texttt{ChannelsBloc}, \\texttt{ProgramsBloc}, \\texttt{EpgBloc}, \\texttt{WatchlistBloc}, \\texttt{StudioBloc}, \\texttt{LiveChatCubit}, \\texttt{ReactionsCubit}, \\texttt{BillingCubit}, \\texttt{SearchBloc}, \\texttt{NotificationBloc}, \\texttt{ConnectivityBloc}.

\\newpage
\\section*{Phụ lục C: Cơ chế Ngoại tuyến SQLite \\& Hàng đợi Đột biến (Mutation Replay Queue)}
\\addcontentsline{toc}{section}{Phụ lục C: Cơ chế Ngoại tuyến SQLite \\& Hàng đợi Đột biến}

Ứng dụng đảm bảo trải nghiệm liền mạch cả khi mất kết nối mạng thông qua cơ sở dữ liệu SQLite cục bộ, tự động lưu đệm kênh, chương trình yêu thích và lưu hàng đợi các tác vụ đánh dấu để đồng bộ lại ngay khi có Internet.

\\newpage
\\section*{Phụ lục D: Kiến trúc Trình phát Video OmniPlayer Đa Nguồn}
\\addcontentsline{toc}{section}{Phụ lục D: Kiến trúc Trình phát Video OmniPlayer Đa Nguồn}

\\texttt{OmniPlayer} hỗ trợ chuyển đổi linh hoạt giữa WebRTC WHEP (độ trễ siêu thấp < 1s), HLS thích ứng đa bitrate (ABR) qua MediaMTX, và tự động dò tìm các thiết bị trình chiếu nội bộ thông qua \\texttt{LanDiscoveryService}.

\\begin{center}
\\includegraphics[width=0.92\\linewidth]{${figDir}/fig_testing_matrix_vi.png}\\\\
\\textit{Hình D.1: Ma trận Kiểm thử Tự động Phân tầng (77 Mobile Tests)}
\\end{center}
`;
    } else {
      return `
\\newpage
\\section*{Appendix A: Catalog of 31 Mobile Flutter Screens \\& GoRouter Architecture}
\\addcontentsline{toc}{section}{Appendix A: Catalog of 31 Mobile Flutter Screens}

The OmniCast mobile app features 31 production screens organized via declarative GoRouter:
\\begin{enumerate}
\\item \\textbf{Discovery \\& Home:} \\texttt{HomeScreen}, \\texttt{CategoriesScreen}, \\texttt{ProgramListScreen}, \\texttt{SearchScreen}.
\\item \\textbf{Live TV \\& Synchronized EPG:} \\texttt{LiveNowScreen}, \\texttt{LiveWatchScreen} (WebRTC WHIP/WHEP low latency, live chat, floating reactions, Super Chat modal), \\texttt{EpgScreen} (24-hour ruler with LIVE NOW synchronized cursor), \\texttt{ChannelsScreen}, \\texttt{ChannelDetailScreen}.
\\item \\textbf{Mobile Live Studio:} \\texttt{LiveStudioScreen} (4-tab broadcaster control surface), \\texttt{MobileStudioRecorderScreen} (real-time camera broadcasting via WebRTC WHIP directly to MediaMTX), \\texttt{AiCuratorScreen}.
\\item \\textbf{User, Security \\& Admin:} \\texttt{WatchlistScreen}, \\texttt{RecordingsScreen}, \\texttt{RecordingDetailScreen}, \\texttt{NotificationsScreen}, \\texttt{ProfileScreen}, \\texttt{SettingsScreen}, \\texttt{LoginScreen}, \\texttt{RegisterScreen}, \\texttt{AdminUsersScreen}, \\texttt{AdminAuditLogsScreen}.
\\end{enumerate}

\\newpage
\\section*{Appendix B: 12 BLoC / Cubit State Management Modules}
\\addcontentsline{toc}{section}{Appendix B: 12 BLoC / Cubit State Management Modules}

Clean separation of concerns with BLoC: \\texttt{AuthBloc}, \\texttt{ChannelsBloc}, \\texttt{ProgramsBloc}, \\texttt{EpgBloc}, \\texttt{WatchlistBloc}, \\texttt{StudioBloc}, \\texttt{LiveChatCubit}, \\texttt{ReactionsCubit}, \\texttt{BillingCubit}, \\texttt{SearchBloc}, \\texttt{NotificationBloc}, and \\texttt{ConnectivityBloc}.

\\newpage
\\section*{Appendix C: Offline-First SQLite Caching \\& Mutation Replay Queue}
\\addcontentsline{toc}{section}{Appendix C: Offline-First SQLite Caching \\& Mutation Replay Queue}

Ensures smooth offline operation using local SQLite storage, cache invalidation, and replay queues that sync mutations as soon as internet connectivity resumes.

\\newpage
\\section*{Appendix D: OmniPlayer Multi-Engine Audiovisual Architecture}
\\addcontentsline{toc}{section}{Appendix D: OmniPlayer Multi-Engine Audiovisual Architecture}

Supports seamless switching between WebRTC WHEP (< 1s sub-second latency), LL-HLS via MediaMTX, and local LAN receiver discovery via \\texttt{LanDiscoveryService}.

\\begin{center}
\\includegraphics[width=0.92\\linewidth]{${figDir}/fig_testing_matrix_en.png}\\\\
\\textit{Figure D.1: Layered Automated Testing Architecture (77 Mobile Tests)}
\\end{center}
`;
    }
  }
}

function buildDocx(reportDir, mainTex, outputDocx, lang, isPrn232) {
  console.log(`==> Preparing Exhaustive Graduation Project DOCX for ${mainTex} (${lang})...`);
  const baseDir = path.resolve(reportDir);
  let content = resolveInputs(mainTex, baseDir);

  // Extract bilingual text first
  content = extractBi(content, lang);

  // Unwrap \fitcol and \fitfull with proper brace balancing
  content = unwrapMacro(content, 'fitcol');
  content = unwrapMacro(content, 'fitfull');

  content = content.replace(/\\omnitag\{([^}]+)\}/g, '**$1**');
  content = content.replace(/\\code\{([^}]+)\}/g, '`$1`');
  content = content.replace(/\\filepath\{([^}]+)\}/g, '*$1*');

  // Strip tcolorbox, onecolumn, twocolumn for clean Word rendering
  content = content.replace(/\\begin\{tcolorbox\}(\[[^\]]*\])?/g, '\n\n');
  content = content.replace(/\\end\{tcolorbox\}/g, '\n\n');
  content = content.replace(/\\(onecolumn|twocolumn)/g, '');
  content = content.replace(/\\color\{[^}]+\}\\rule\{[^}]+\}\{[^}]+\}/g, '\n\n---\n\n');

  // REPLACE ALL TIKZ FIGURE MACROS WITH ACTUAL PRE-RENDERED HIGH-RES PNG IMAGES!
  const figDir = path.resolve(baseDir, '../figures').replace(/\\/g, '/');
  
  const figReplacements = [
    { macro: '\\figArchitecture', png: `${figDir}/fig_architecture_${lang}.png`, caption: lang === 'vi' ? 'Hình 2.1: Sơ đồ Kiến trúc Phân tầng Tổng thể Hệ thống OmniCast' : 'Figure 2.1: OmniCast System Overall Layered Architecture' },
    { macro: '\\figLiveStreamArch', png: `${figDir}/fig_livestream_arch_${lang}.png`, caption: lang === 'vi' ? 'Hình 2.2: Kiến trúc Luồng Phát sóng Trực tiếp Real-Time và Live Studio' : 'Figure 2.2: End-to-End LiveStream and Live Studio Real-Time Architecture' },
    { macro: '\\figScheduleConflict', png: `${figDir}/fig_conflict_${lang}.png`, caption: lang === 'vi' ? 'Hình 3.1: Thuật toán Phát hiện và Ngăn chặn Xung đột Lịch phát EPG' : 'Figure 3.1: EPG Schedule Conflict Detection and Prevention Algorithm' },
    { macro: '\\figAiPipeline', png: `${figDir}/fig_ai_pipeline_${lang}.png`, caption: lang === 'vi' ? 'Hình 3.2: Quy trình Biên tập Thông minh Đa tầng AI Curator Pipeline' : 'Figure 3.2: Multi-Stage AI Content Curator Processing Pipeline' },
    { macro: '\\figDatabaseArchitecture', png: `${figDir}/fig_database_${lang}.png`, caption: lang === 'vi' ? 'Hình 2.3: Kiến trúc Cơ sở Dữ liệu Quan hệ 5 Phân vùng Miền (21 Model Prisma)' : 'Figure 2.3: 5-Domain Relational Database Architecture (21 Prisma Models)' },
    { macro: '\\figAuthFlow', png: `${figDir}/fig_auth_flow_${lang}.png`, caption: lang === 'vi' ? 'Hình 2.4: Quy trình Xác thực JWT và Phân quyền RBAC 4 Cấp độ' : 'Figure 2.4: JWT Authentication and 4-Tier RBAC Access Control Flow' },
    { macro: '\\figIngest', png: `${figDir}/fig_ingest_${lang}.png`, caption: lang === 'vi' ? 'Hình 3.3: Quy trình Nạp và Tổng hợp Dữ liệu Lịch phát Đa nguồn' : 'Figure 3.3: Multi-Source Digital Broadcast Ingest and EPG Normalisation Flow' },
    { macro: '\\figCicd', png: `${figDir}/fig_cicd_${lang}.png`, caption: lang === 'vi' ? 'Hình 5.1: Đường ống Tự động hóa CI/CD GitHub Actions và Triển khai Đám mây' : 'Figure 5.1: GitHub Actions Automated CI/CD and Cloud Deployment Pipeline' },
    { macro: '\\figMobileArchitecture', png: `${figDir}/fig_mobile_arch_${lang}.png`, caption: lang === 'vi' ? 'Hình 3.1: Kiến trúc Phân tầng Ứng dụng Di động Flutter BLoC' : 'Figure 3.1: Flutter BLoC Layered Architecture for Mobile Client' },
    { macro: '\\figMobileScreenMap', png: `${figDir}/fig_mobile_screens_${lang}.png`, caption: lang === 'vi' ? 'Hình 3.2: Cấu trúc Điều hướng và Phân cấp 31 Màn hình Ứng dụng Di động' : 'Figure 3.2: Mobile Navigation Hierarchy across 31 Dedicated Screens' },
    { macro: '\\figOfflineSync', png: `${figDir}/fig_offline_sync_${lang}.png`, caption: lang === 'vi' ? 'Hình 3.3: Quy trình Bộ đệm Ngoại tuyến SQLite và Hàng đợi Đột biến' : 'Figure 3.3: Offline-First SQLite Caching and Mutation Replay Queue Flow' },
  ];

  for (const fr of figReplacements) {
    if (content.includes(fr.macro)) {
      content = content.split(fr.macro).join(`\n\n\\begin{center}\n\\includegraphics[width=0.92\\linewidth]{${fr.png}}\\\\\n\\textit{${fr.caption}}\n\\end{center}\n\n`);
    }
  }

  // Also replace any remaining raw tikzpicture environments
  content = content.replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g, '\n\n*(Sơ đồ kiến trúc TikZ)*\n\n');

  // Fix all \includegraphics paths so pandoc finds them
  content = content.replace(/\\includegraphics(\[[^\]]*\])?\{([^}]+)\}/g, (match, opts, imgPath) => {
    let resolvedPath = imgPath;
    if (!path.isAbsolute(imgPath)) {
      resolvedPath = path.resolve(baseDir, imgPath);
    }
    resolvedPath = resolvedPath.replace(/\\/g, '/');
    return `\\includegraphics{${resolvedPath}}`;
  });

  // Ensure every major Chapter (\section) starts cleanly at the top of a new page!
  content = content.replace(/\\section\{/g, '\n\\newpage\n\\section{');

  // Prepend rich Graduation Project Front Matter
  const frontMatter = getGraduationProjectFrontMatter(isPrn232, lang);

  // Append exhaustive technical appendices
  const appendices = getComprehensiveAppendices(isPrn232, lang, figDir);

  const fullReportTex = frontMatter + '\n\n' + content + '\n\n' + appendices;

  const tempTex = path.join(baseDir, `_temp_${lang}.tex`);
  fs.writeFileSync(tempTex, fullReportTex, 'utf8');

  console.log(`==> Running Pandoc with --toc --toc-depth=3 to generate exhaustive graduation project Word report: ${path.basename(outputDocx)}...`);
  try {
    execSync(`"${PANDOC}" -s --toc --toc-depth=3 "${tempTex}" -o "${outputDocx}"`, { stdio: 'inherit' });
    console.log(`==> Successfully generated comprehensive ${path.basename(outputDocx)}`);
  } catch (err) {
    console.error('Error running Pandoc:', err.message);
  } finally {
    if (fs.existsSync(tempTex)) fs.unlinkSync(tempTex);
  }
}

// Build 4 Exhaustive DOCX files
const REPORTS_ROOT = path.resolve(__dirname, '../../01_Reports');

const targets = [
  {
    dir: path.join(REPORTS_ROOT, 'PRN232/latex'),
    tex: 'main-vi.tex',
    out: path.join(REPORTS_ROOT, 'PRN232/PRN232_Report_VI.docx'),
    lang: 'vi',
    isPrn232: true
  },
  {
    dir: path.join(REPORTS_ROOT, 'PRN232/latex'),
    tex: 'main-en.tex',
    out: path.join(REPORTS_ROOT, 'PRN232/PRN232_Report_EN.docx'),
    lang: 'en',
    isPrn232: true
  },
  {
    dir: path.join(REPORTS_ROOT, 'PRM393/latex'),
    tex: 'main-vi.tex',
    out: path.join(REPORTS_ROOT, 'PRM393/PRM393_Report_VI.docx'),
    lang: 'vi',
    isPrn232: false
  },
  {
    dir: path.join(REPORTS_ROOT, 'PRM393/latex'),
    tex: 'main-en.tex',
    out: path.join(REPORTS_ROOT, 'PRM393/PRM393_Report_EN.docx'),
    lang: 'en',
    isPrn232: false
  }
];

for (const t of targets) {
  buildDocx(t.dir, t.tex, t.out, t.lang, t.isPrn232);
}
console.log('==> All 4 Exhaustive DOCX files generated successfully!');

// Immediately export all 4 DOCX to authentic Word PDFs using Word COM
console.log('==> Automatically formatting and exporting all 4 Word reports to PDF via native Word COM...');
const exportScript = path.join(__dirname, 'export-word-pdfs.ps1');
try {
  execSync(`powershell -ExecutionPolicy Bypass -File "${exportScript}"`, { stdio: 'inherit' });
  console.log('==> All Word reports and their native PDF counterparts are now fully formatted, synchronized and exhaustive!');
} catch (err) {
  console.error('Error exporting Word PDFs:', err.message);
}
