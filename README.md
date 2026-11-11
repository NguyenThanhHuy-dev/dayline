# dayline

**English:** a frontend-only web app. Paste or load a plain-text daily schedule and see it as a vertical timeline (no backend, no build step). The UI is available in Vietnamese and English: use the **VI | EN** switch in the header (default follows your browser language, choice is saved). The text format, type names (`work`, `meal`, ...) and group names stay as you write them. Run with `python -m http.server 8000`, test with `npm test`. English examples: `examples/weekday.en.txt`, `examples/weekend.en.txt`. Translations live in `src/i18n.js`; parser issues are structured (`{line, code, params}`) and formatted by the UI.

**Tiếng Việt:**

Web app thuần frontend: dán hoặc tải file text thời gian biểu, xem dạng timeline dọc. Không backend, không bước build.

## Chạy

```bash
python -m http.server 8000
```

Mở http://localhost:8000. Test parser: `npm test` (node:test, không cần cài gì).

## Cách dùng

1. Bấm **Sao chép mẫu prompt** (dưới ô nhập), dán vào ChatGPT (hoặc AI khác), thêm routine của bạn ở cuối.
2. Copy kết quả AI trả về, dán vào ô bên trái (hoặc **Mở tệp .txt**). Timeline cập nhật ngay.
3. Chọn nhóm ngày bằng các nút pill. Lỗi/cảnh báo hiện dưới ô nhập, theo số dòng.
4. Thống kê giờ theo loại hiện trên timeline. Nội dung tự lưu vào localStorage.
5. **Sao chép liên kết**: nội dung nén (lz-string) vào URL hash, mở link là thấy. **Xuất PNG**: tải ảnh nhóm ngày đang chọn.

## Định dạng

```
# Thứ 2-6
06:45-07:45 | personal | Dậy, giãn cơ | ghi chú tùy chọn
08:30-12:00 | work | Làm việc
```

- Giờ: `6:30`, `06:30`, `6h30`; dấu `-` hoặc `–`. Dùng `24:00` cho nửa đêm. Khung giờ không vắt qua nửa đêm (tách thành hai dòng).
- Loại: `personal commute work meal study exercise chores relax sleep`. Loại lạ: tô xám + cảnh báo.
- Dòng trống, khoảng trắng thừa, rào ``` đều bị bỏ qua.

Ví dụ: `examples/weekday.txt`, `examples/weekend.txt`.

## Cấu trúc

`i18n.js` (vi/en), `parser.js` (text → model), `serializer.js` (model → text), `render.js`, `stats.js`, `prompt.js`, `app.js`. `vendor/lz-string.min.js` là bản copy lz-string 1.5.0 (MIT).

## Quy trình làm việc

`feature/*` (tách từ `main`) → PR vào `staging` (test) → PR `staging` vào `main` (deploy). Không push trực tiếp vào `main` và `staging`. CI (`.github/workflows/flow.yml`) chạy `npm test` và chặn PR vào `main` nếu không đến từ `staging`.
