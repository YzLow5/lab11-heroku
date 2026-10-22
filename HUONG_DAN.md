# Hướng dẫn Lab 11 – Triển khai Microservices lên Heroku

Tất cả lệnh dưới đây chạy trong **Windows PowerShell**.
📸 = chỗ nên chụp màn hình để đưa vào báo cáo.

---

## 0. Chuẩn bị (làm 1 lần)

### 0.1 Tài khoản và chi phí
Heroku **không còn gói miễn phí**. Mỗi app cần 1 dyno, vì vậy bạn cần một trong hai:

- **Heroku for GitHub Students** (khuyên dùng): đăng ký tại https://www.heroku.com/github-students bằng tài khoản GitHub sinh viên → nhận $13/tháng credit, đủ cho gói Eco + 1 database Postgres.
- Hoặc thêm thẻ thanh toán vào tài khoản.

Sau đó vào **Account settings → Billing → Subscribe to Eco Dynos Plan** ($5/tháng, dùng chung cho tất cả app, app tự "ngủ" sau 30 phút không dùng).

### 0.2 Cài công cụ
```powershell
heroku --version   # Heroku CLI (đã cài ở Lab 6)
git --version      # Git for Windows
```
Nếu `git commit` báo lỗi chưa có tên/email:
```powershell
git config --global user.name "Ho A Nhat Luu"
git config --global user.email "email-cua-ban@gmail.com"
```

### 0.3 Đăng nhập (Bước 1)
```powershell
heroku login
```
Nhấn phím bất kỳ → trình duyệt mở ra → bấm **Log In**. 📸

### 0.4 Đặt tiền tố tên app
Tên app Heroku phải **duy nhất trên toàn thế giới**, chỉ chữ thường, số và dấu `-`, bắt đầu bằng chữ cái, tối đa 30 ký tự. Dùng MSSV cho chắc chắn không trùng:
```powershell
cd D:\DTDM\lab11-heroku
$P = "n23dccn173"
```
> ⚠️ Biến `$P` và các biến `$USER_URL`… sẽ mất khi đóng PowerShell. Nếu mở cửa sổ mới, chạy lại mục 0.4 và mục "Lấy lại URL" ở cuối file.

> ⚠️ **URL của app Heroku bây giờ có thêm đuôi ngẫu nhiên**, dạng `https://n23dccn173-user-service-1a2b3c4d5e6f.herokuapp.com` – **không phải** `https://n23dccn173-user-service.herokuapp.com` như trong đề. Vì vậy hướng dẫn này luôn lấy URL thật bằng lệnh `heroku apps:info`.

---

## Bước 2: Code
Đã có sẵn trong thư mục này (đã sửa các lỗi của code mẫu – xem cuối file). Không cần `npm install` ở máy, Heroku tự cài khi deploy.

---

## Bước 3: Deploy từng service

### 3.1 User Service
```powershell
cd D:\DTDM\lab11-heroku\user-service
git init
git add .
git commit -m "Initial commit - User Service"
git branch -M main
heroku create "$P-user-service"
git push heroku main
```
📸 Ảnh đoạn cuối của `git push` (có dòng `Verifying deploy... done`).
> `git branch -M main` là bắt buộc: Git trên Windows thường tạo nhánh `master`, khi đó `git push heroku main` sẽ báo lỗi *src refspec main does not match any*.

Lấy URL và test:
```powershell
$USER_URL = (heroku apps:info -a "$P-user-service" --json | ConvertFrom-Json).app.web_url.TrimEnd('/')
$USER_URL
curl.exe "$USER_URL/health"
curl.exe "$USER_URL/users"
heroku logs -n 30 -a "$P-user-service"
```
📸 Ảnh kết quả `/health`, `/users`. Có thể chạy `heroku open` để mở trên trình duyệt.

### 3.2 Product Service
```powershell
cd ..\product-service
git init
git add .
git commit -m "Initial commit - Product Service"
git branch -M main
heroku create "$P-product-service"
git push heroku main

$PRODUCT_URL = (heroku apps:info -a "$P-product-service" --json | ConvertFrom-Json).app.web_url.TrimEnd('/')
curl.exe "$PRODUCT_URL/health"
curl.exe "$PRODUCT_URL/products"
```
📸

### 3.3 Order Service
```powershell
cd ..\order-service
git init
git add .
git commit -m "Initial commit - Order Service"
git branch -M main
heroku create "$P-order-service"
heroku config:set USER_SERVICE_URL=$USER_URL PRODUCT_SERVICE_URL=$PRODUCT_URL -a "$P-order-service"
git push heroku main

$ORDER_URL = (heroku apps:info -a "$P-order-service" --json | ConvertFrom-Json).app.web_url.TrimEnd('/')
curl.exe "$ORDER_URL/health"
```
📸 Ảnh `/health` – phần `dependencies` phải hiện đúng URL của User và Product Service.

### 3.4 API Gateway
```powershell
cd ..\api-gateway
git init
git add .
git commit -m "Initial commit - API Gateway"
git branch -M main
heroku create "$P-api-gateway"
heroku config:set USER_SERVICE_URL=$USER_URL PRODUCT_SERVICE_URL=$PRODUCT_URL ORDER_SERVICE_URL=$ORDER_URL -a "$P-api-gateway"
git push heroku main

$GATEWAY_URL = (heroku apps:info -a "$P-api-gateway" --json | ConvertFrom-Json).app.web_url.TrimEnd('/')
$GATEWAY_URL
curl.exe "$GATEWAY_URL/health"
```
📸 Ảnh `/health` – cả 3 service đều `"status":"healthy"`.

---

## Bước 4: Test toàn bộ hệ thống
```powershell
cd D:\DTDM\lab11-heroku
powershell -ExecutionPolicy Bypass -File .\test-heroku.ps1 -GatewayUrl $GATEWAY_URL
```
Script sẽ: xem gateway, health check, liệt kê users, tạo user, liệt kê/tạo product, tạo order (đi qua Order → User + Product Service), kiểm tra tồn kho giảm 100 → 98, thử order với user không tồn tại (lỗi 400), liệt kê orders.
📸 Chụp toàn bộ kết quả (có thể 2–3 ảnh).

> Lần gọi đầu có thể chậm 5–20 giây vì các dyno Eco đang ngủ. Nếu bị timeout, chạy lại lần nữa.
> `test-heroku.sh` (bản bash của đề) cũng có, nhưng cần Git Bash + `jq`.

Mở thêm trên trình duyệt: `$GATEWAY_URL/`, `$GATEWAY_URL/users`, `$GATEWAY_URL/products`, `$GATEWAY_URL/orders`. 📸

---

## Bước 5: Giám sát và Logging

### 5.1 Logs từng service
```powershell
heroku logs -n 50 -a "$P-order-service"
heroku logs -n 50 -a "$P-api-gateway"
```
📸 Log của order-service có các dòng `User verified`, `Product verified`, `Stock updated successfully`, `Order created`. Log gateway có các dòng `Proxying POST /orders to ...`.
(`heroku logs --tail -a ...` để xem trực tiếp, nhấn Ctrl+C để thoát.)

### 5.2 Dashboard
Vào https://dashboard.heroku.com/apps 📸 (danh sách 4 app). Bấm vào 1 app → tab **Metrics** (response time, throughput) và **More → View logs**. 📸
> Tab Metrics có thể hiện thông báo không hỗ trợ với dyno Eco – vẫn chụp lại và ghi chú vào báo cáo.

### 5.3 Add-ons
Papertrail và New Relic là add-on của bên thứ ba; credit sinh viên **không** trả được cho chúng. Kiểm tra gói miễn phí trước:
```powershell
heroku addons:plans papertrail
heroku addons:plans newrelic
```
Nếu có gói `$0`/free thì tạo, ví dụ: `heroku addons:create papertrail:<ten-goi-free> -a "$P-api-gateway"`. Nếu không có gói miễn phí thì bỏ qua và ghi chú trong báo cáo.
Gói Postgres `hobby-dev` trong đề **đã bị Heroku khai tử** – dùng `essential-0` (xem Bước 9).

---

## Bước 6: Environment Variables
```powershell
heroku config:set NODE_ENV=production LOG_LEVEL=info -a "$P-user-service"
heroku config:set NODE_ENV=production RATE_LIMIT=1000 -a "$P-api-gateway"
heroku config -a "$P-api-gateway"
heroku config -a "$P-order-service"
```
📸 Ảnh `heroku config` của gateway và order-service.
(Mỗi lần `config:set` Heroku tự khởi động lại app.)

---

## Bước 7: Custom Domain và SSL
Bước này cần **sở hữu một tên miền thật**. Nếu không có, làm phần sau để có minh chứng rồi xoá:
```powershell
heroku domains:add api.n23dccn173-lab11.com -a "$P-api-gateway"
heroku domains -a "$P-api-gateway"
```
📸 Ảnh cột **DNS Target** – đây là giá trị cần khai báo CNAME ở nhà cung cấp tên miền:
`api.n23dccn173-lab11.com  CNAME  <dns-target>.herokudns.com`

```powershell
heroku certs:auto:enable -a "$P-api-gateway"
```
```powershell
heroku certs:auto -a "$P-api-gateway"
```
ACM (chứng chỉ SSL tự động từ Let's Encrypt) có hỗ trợ dyno Eco. Vì tên miền chưa được trỏ CNAME, trạng thái chứng chỉ sẽ là đang chờ/không xác thực được DNS – điều này là bình thường, chụp lại 📸 và ghi chú trong báo cáo. Dọn dẹp:
```powershell
heroku domains:remove api.n23dccn173-lab11.com -a "$P-api-gateway"
```

---

## Bước 8: CI/CD với GitHub Actions

Mỗi service hiện có 1 repo git riêng (để `git push heroku`). Để đưa cả project lên **1 repo GitHub**, phải xoá các repo con trước (nếu không GitHub chỉ thấy thư mục rỗng):
```powershell
cd D:\DTDM\lab11-heroku
Remove-Item -Recurse -Force user-service\.git, product-service\.git, order-service\.git, api-gateway\.git
git init
git add .
git commit -m "Lab 11 - microservices on Heroku"
git branch -M main
```
1. Vào https://github.com/new tạo repo **lab11-heroku** (Private hoặc Public, KHÔNG tick "Add README").
2. Đẩy code lên:
   ```powershell
   git remote add origin https://github.com/<github-username>/lab11-heroku.git
   git push -u origin main
   ```
3. Tạo API key Heroku:
   ```powershell
   heroku authorizations:create -d "GitHub Actions"
   ```
   Copy giá trị dòng **Token**.
4. Trên GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**, tạo 2 secret:
   - `HEROKU_API_KEY` = token vừa copy
   - `HEROKU_PREFIX` = `n23dccn173`
   📸 (ảnh danh sách secret, giá trị bị ẩn)
5. Vào tab **Actions → Deploy to Heroku → Run workflow** (hoặc push 1 commit bất kỳ). Đợi 4 job chuyển xanh. 📸 Ảnh sơ đồ 4 job: user + product chạy song song → order → gateway.

> Workflow trong `.github/workflows/heroku-deploy.yml` đã được sửa: không dùng action `akhileshns/heroku-deploy` vì nó cần Heroku CLI trên runner (image Ubuntu mới không còn cài sẵn), mà push thẳng tới `git.heroku.com` bằng API key.

Cách khác (Dashboard): app → tab **Deploy** → **GitHub** → Connect → bật **Automatic deploys**. Cách này chỉ dùng được khi app nằm ở thư mục gốc của repo, nên với project nhiều thư mục như lab này, GitHub Actions là phù hợp.

---

## Bước 9: Tích hợp PostgreSQL

### 9.1 Tạo database
```powershell
heroku addons:create heroku-postgresql:essential-0 -a "$P-user-service"
heroku addons:wait -a "$P-user-service"
heroku config:get DATABASE_URL -a "$P-user-service"
```
📸 (che bớt mật khẩu trong DATABASE_URL trước khi đưa vào báo cáo)
> Đề yêu cầu tạo cho cả 3 service, nhưng chỉ User Service được sửa code để dùng Postgres. Mỗi database `essential-0` tốn $5/tháng (tính theo giờ), credit sinh viên chỉ đủ cho 1 cái. Nếu muốn làm đủ cả 3 cho giống đề, chạy thêm 2 lệnh dưới, chụp ảnh, rồi **xoá ngay** để không tốn tiền:
> ```powershell
> heroku addons:create heroku-postgresql:essential-0 -a "$P-product-service"
> heroku addons:create heroku-postgresql:essential-0 -a "$P-order-service"
> ```

### 9.2 – 9.3 Cập nhật code User Service
Copy 3 file trong `buoc9-postgres\user-service\` đè lên `user-service\`:
```powershell
cd D:\DTDM\lab11-heroku
Copy-Item buoc9-postgres\user-service\* user-service\ -Force
```
(`db.js` mới, `server.js` dùng PostgreSQL, `package.json` thêm thư viện `pg`.)

### 9.4 Deploy code mới
Nếu đã làm Bước 8 – chỉ cần push lên GitHub, Actions tự deploy:
```powershell
git add .
git commit -m "Add PostgreSQL integration"
git push
```
Nếu bỏ qua Bước 8 (user-service vẫn còn repo git riêng):
```powershell
cd user-service
git add .
git commit -m "Add PostgreSQL integration"
git push heroku main
```
Xem log: `heroku logs -n 30 -a "$P-user-service"` → phải có dòng `Users table initialized`. 📸

### 9.5 Test Database
Qua API:
```powershell
curl.exe "$GATEWAY_URL/users/health"
Invoke-RestMethod -Method Post "$GATEWAY_URL/users" -ContentType "application/json" -Body '{"name":"Postgres User","email":"pg@heroku.com"}'
Invoke-RestMethod "$GATEWAY_URL/users"
Invoke-RestMethod -Method Post "$GATEWAY_URL/orders" -ContentType "application/json" -Body '{"userId":1,"productId":1,"quantity":1}'
```
📸 `/users/health` phải trả `"database":"connected"`. Lưu ý: database mới nên danh sách user bắt đầu rỗng (John Doe, Jane Smith của bản in-memory không còn).

Qua Heroku CLI (cần có `psql` trong máy – có sẵn nếu đã cài PostgreSQL, nếu báo *psql not found* thì thêm `C:\Program Files\PostgreSQL\<phiên bản>\bin` vào biến môi trường PATH rồi mở lại PowerShell):
```powershell
heroku pg:psql -a "$P-user-service"
```
Trong psql:
```sql
\dt
SELECT * FROM users;
SELECT COUNT(*) FROM users;
\q
```
📸 (Câu `... WHERE deleted_at IS NULL` trong đề sẽ báo lỗi vì bảng không có cột `deleted_at` – dùng `SELECT COUNT(*) FROM users;`.)

Không có psql: dùng `heroku pg:info -a "$P-user-service"` hoặc vào Dashboard → app → Heroku Postgres → tab **Dataclips** để chạy SQL. 📸

---

## Dọn dẹp sau khi nộp bài (tránh bị trừ tiền/credit)
```powershell
heroku addons:destroy heroku-postgresql -a "$P-user-service" --confirm "$P-user-service"
heroku apps:destroy -a "$P-api-gateway" --confirm "$P-api-gateway"
heroku apps:destroy -a "$P-order-service" --confirm "$P-order-service"
heroku apps:destroy -a "$P-product-service" --confirm "$P-product-service"
heroku apps:destroy -a "$P-user-service" --confirm "$P-user-service"
```
Rồi vào Billing huỷ gói Eco nếu không dùng nữa.

---

## Lấy lại URL khi mở PowerShell mới
```powershell
$P = "n23dccn173"
$USER_URL    = (heroku apps:info -a "$P-user-service"    --json | ConvertFrom-Json).app.web_url.TrimEnd('/')
$PRODUCT_URL = (heroku apps:info -a "$P-product-service" --json | ConvertFrom-Json).app.web_url.TrimEnd('/')
$ORDER_URL   = (heroku apps:info -a "$P-order-service"   --json | ConvertFrom-Json).app.web_url.TrimEnd('/')
$GATEWAY_URL = (heroku apps:info -a "$P-api-gateway"     --json | ConvertFrom-Json).app.web_url.TrimEnd('/')
```

---

## Lỗi thường gặp
| Lỗi | Cách xử lý |
|---|---|
| `Name ... is already taken` | Đổi `$P` thành tên khác (vd thêm số) |
| `src refspec main does not match any` | Chưa chạy `git branch -M main` |
| `Verification required` / `payment information` | Chưa đăng ký GitHub Students hoặc chưa thêm thẻ |
| Gateway `/health` báo `unhealthy` | Kiểm tra `heroku config -a "$P-api-gateway"` có đúng URL thật (có đuôi ngẫu nhiên) không |
| Order báo `Invalid user ...` | Kiểm tra `heroku config -a "$P-order-service"`; với bản Postgres phải tạo user trước |
| `Application error` khi mở app | Xem `heroku logs -n 100 -a <app>` |
| Lần gọi đầu bị timeout | Dyno Eco đang ngủ, gọi lại sau vài giây |

---

## Các lỗi trong code mẫu đã được sửa
1. **URL bị dính `&#39;` và `&quot;`** (ký tự HTML khi copy từ web) → lỗi cú pháp JavaScript.
2. **API Gateway xoá tiền tố đường dẫn** (`pathRewrite: {'^/users': ''}`) → `/users/1` bị chuyển thành `/1` → 404 vì service định nghĩa route `/users/:id`. Đã sửa: giữ nguyên đường dẫn, riêng `/users/health` chuyển thành `/health` (để Bước 9.5 chạy được).
3. **Gateway dùng `express.json()` trước proxy** → body của POST bị đọc mất, request bị treo. Đã bỏ.
4. **Node 16 đã hết hỗ trợ** trên Heroku và không có `fetch` (gateway dùng `fetch` cho health check) → đổi sang Node `22.x`.
5. Health check của gateway luôn báo healthy kể cả khi service trả lỗi 500 → giờ kiểm tra mã HTTP.
6. Kết nối Postgres chỉ bật SSL khi `NODE_ENV=production` → nếu quên set sẽ không kết nối được Heroku Postgres. Đã bật SSL mặc định.
7. Gói `heroku-postgresql:hobby-dev` không còn → `essential-0`.
8. Id tạo bằng `length + 1` bị trùng sau khi xoá → dùng bộ đếm riêng.
