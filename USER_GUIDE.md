# 📘 Hướng Dẫn Sử Dụng (User Guide) - Enterprise AI Agent Builder

Chào mừng bạn đến với tài liệu hướng dẫn sử dụng chi tiết cho **Enterprise AI Agent Visual Builder Lab**. Tài liệu này sẽ giúp bạn hiểu rõ từng thành phần trong ứng dụng, cách kéo thả, cấu hình, và một ví dụ hoàn chỉnh để bạn dễ dàng bắt đầu.

---

## 🏗️ 1. Cấu Trúc Giao Diện (UI Components)

Giao diện ứng dụng được chia thành 4 khu vực chính:

1. **Thanh Công Cụ (Top Header)**: Chứa trạng thái của hệ thống và nút **Run Workflow / Stop**.
2. **Bảng Điều Khiển Node (Sidebar Trái)**: Còn gọi là Node Palette. Đây là kho chứa các khối (nodes) có sẵn để bạn kéo và thả vào không gian làm việc.
3. **Canvas Kéo-Thả (Khu Vực Trung Tâm)**: Không gian chính để bạn vẽ luồng (workflow). Bạn có thể kết nối các điểm nối (dots) từ Node này sang Node khác.
4. **X-Ray Inspector (Bottom Panel)**: Nằm ở dưới cùng màn hình, cung cấp 3 tab để bạn theo dõi hệ thống:
   - **Console / Logs**: Xem nhật ký chạy (logs) và dữ liệu truyền qua lại giữa các Node.
   - **Profiler**: Phân tích hiệu năng (độ trễ, lượng token sử dụng của AI, độ phức tạp thuật toán).
   - **Security (AST)**: Kiểm tra các rào cản bảo mật và che giấu dữ liệu nhạy cảm (PII).

---

## 🧩 2. Chi Tiết Các Khối (Nodes) & Ví dụ Cấu Hình

Khi bạn click vào biểu tượng ⚙️ (Bánh răng) trên mỗi Node, một bảng cấu hình sẽ hiện ra ở bên phải. Dưới đây là chức năng và cách dùng của từng loại Node.

### 2.1. ▶️ Trigger / Input (Nút Khởi Tạo)
- **Mô tả**: Đây là điểm bắt đầu của mọi Workflow. Nó nhận dữ liệu đầu vào từ người dùng hoặc hệ thống khác (Webhook, Schedule, Chat).
- **Ví dụ sử dụng**: Bắt đầu luồng khi có khách hàng gửi tin nhắn mới.
- **Đầu ra (Outputs)**: 1.

### 2.2. 🧠 LLM Reasoner (Nút Suy Luận AI)
- **Mô tả**: Khối não bộ của hệ thống. Nó sử dụng các mô hình ngôn ngữ lớn để suy luận, phân tích và đưa ra quyết định.
- **Cấu hình**:
  - `Model`: Chọn mô hình (gemini-1.5-pro, claude-3-opus).
  - `Strategy`: Chiến lược suy luận (ReAct, Plan & Execute).
  - `System Prompt`: Prompt điều hướng AI (VD: *"Bạn là một trợ lý phân tích dữ liệu tài chính"*).
  - `Temperature`: Độ sáng tạo của câu trả lời (0.0 đến 1.0).
- **Đầu vào/Đầu ra**: 1 Input / 1 Output.

### 2.3. 🗄️ Memory / State (Nút Bộ Nhớ)
- **Mô tả**: Dùng để tra cứu ngữ cảnh (RAG) hoặc lưu trữ thông tin dài hạn vào Database.
- **Cấu hình**:
  - `Type`: Loại cơ sở dữ liệu (Vector DB, Graph DB).
  - `Compaction Strategy`: Chiến lược thu gọn bộ nhớ khi quá đầy (VD: Tóm tắt lại - Summarize).

### 2.4. 🔀 Logic Router (Nút Rẽ Nhánh)
- **Mô tả**: Định tuyến luồng xử lý dựa trên điều kiện logic. 
- **Cấu hình**:
  - `Condition 1`: Điều kiện (VD: `payload.intent == "refund"`).
  - `Route 1 To`: Nhánh sẽ đi nếu điều kiện đúng.
- **Đầu ra**: 2 Outputs (để rẽ làm 2 luồng khác nhau).

### 2.5. 🛠️ Tool / Action (Nút Công Cụ)
- **Mô tả**: Cho phép AI thực hiện hành động thực tế ra thế giới bên ngoài (Gọi API, Chạy SQL, Chạy Code Python, Search Web).
- **Cấu hình**:
  - `Tool Type`: Chọn loại công cụ (SQL DB, Web Search, REST API).

### 2.6. 📈 Worker Node
- **Mô tả**: Thực thi các tác vụ Machine Learning chuyên biệt (không phải LLM), ví dụ như nhận diện hình ảnh (CNN), xử lý âm thanh.

### 2.7. 🛑 Saga Checkpoint
- **Mô tả**: Khối kiểm soát giao dịch (Transaction). Nếu các hành động sau đó bị lỗi (ví dụ trừ tiền thẻ lỗi), Saga Checkpoint sẽ phát tín hiệu **Rollback** để khôi phục trạng thái ban đầu.
- **Đầu ra**: Có 2 đầu ra (1 để tiếp tục, 1 để Rollback).

---

## 🚀 3. Hướng Dẫn Thực Hành: Xây Dựng Agent Hỗ Trợ Khách Hàng

Để giúp bạn dễ hình dung, hãy cùng xây dựng một hệ thống Tự động trả lời và Xử lý hoàn tiền.

**Bước 1: Bắt đầu luồng**
- Kéo Node **Trigger / Input** vào Canvas. (Nhận tin nhắn của khách).

**Bước 2: Phân loại yêu cầu**
- Kéo Node **LLM Reasoner** vào, nối từ Trigger sang LLM.
- Bấm ⚙️ Cài đặt System Prompt: *"Phân loại yêu cầu của khách hàng thành: 'hoan_tien', 'hoi_dap'."*

**Bước 3: Rẽ nhánh xử lý**
- Kéo Node **Logic Router** vào và nối từ LLM sang.
- Bấm ⚙️ Cài đặt điều kiện: `payload.intent == "hoan_tien"`.

**Bước 4: Thực hiện hành động**
- Từ đầu ra của Router, rẽ làm 2 nhánh:
  - **Nhánh 1 (Hoàn tiền)**: Nối vào một **Tool / Action** (Cài đặt loại Tool là `REST API` để gọi API ngân hàng).
  - **Nhánh 2 (Hỏi đáp)**: Nối vào một **Memory / State** để tìm kiếm tài liệu (RAG), sau đó nối tiếp vào một **LLM Reasoner** khác để trả lời.

**Bước 5: Chạy thử**
- Bấm nút **Run Workflow** ở góc trên cùng.
- Mở bảng **Console / Logs** (bên dưới) để quan sát dòng dữ liệu đi qua từng Node. Bạn sẽ thấy các Node đổi màu xanh (Success) báo hiệu chạy thành công!

---
*Chúc bạn có những trải nghiệm tuyệt vời khi thiết kế các Agent AI cấp doanh nghiệp!*
