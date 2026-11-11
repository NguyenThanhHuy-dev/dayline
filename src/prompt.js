import { TYPES } from './parser.js';

export function buildPrompt() {
  return `Bạn là trợ lý lập thời gian biểu. Hãy viết hoặc sửa thời gian biểu của tôi theo ĐÚNG định dạng text dưới đây.

ĐỊNH DẠNG
- Mỗi nhóm ngày bắt đầu bằng một dòng: # Tên nhóm ngày (ví dụ: # Thứ 2-6, # Thứ 7, # Chủ nhật)
- Mỗi hoạt động một dòng: HH:MM-HH:MM | loại | Tiêu đề | ghi chú (tùy chọn) | ghi chú 2 (tùy chọn)
- Giờ dạng 24 giờ, ví dụ 06:30 hoặc 22:45. Giờ kết thúc phải lớn hơn giờ bắt đầu; dùng 24:00 cho nửa đêm.
- loại chỉ được là một trong: ${TYPES.join(', ')}
- Các khung giờ liên tiếp, không chồng nhau, không để hở.

VÍ DỤ
# Thứ 2-6
06:45-07:45 | personal | Dậy, giãn cơ, vệ sinh cá nhân | Giãn cơ 10 phút
07:45-08:30 | commute | Đi làm
08:30-12:00 | work | Làm việc
12:00-13:00 | meal | Ăn trưa
13:00-17:30 | work | Làm việc | Bữa phụ lúc 15:30
17:30-18:30 | commute | Đi về
18:30-19:30 | meal | Ăn tối
19:30-22:45 | relax | Thư giãn
22:45-24:00 | sleep | Ngủ

# Thứ 7
08:00-09:00 | personal | Dậy, vệ sinh cá nhân
09:00-12:00 | exercise | Chạy bộ, tập gym

YÊU CẦU
Chỉ trả về nội dung theo đúng định dạng trên, trong một khối mã (code block). Không giải thích, không thêm lời nói đầu hay kết luận.

ROUTINE CỦA TÔI (dán hoặc mô tả bên dưới, kèm yêu cầu chỉnh sửa nếu có):
<<< DÁN ROUTINE CỦA BẠN Ở ĐÂY >>>
`;
}
