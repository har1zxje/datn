# Freshness Evaluation Protocol (Standards-Based)

Tai lieu nay bo sung danh gia do tuoi theo huong **kiem dinh dinh luong**, thay vi chi danh gia dinh tinh.

## 1) Muc tieu

- Dinh nghia `ground-truth` dua tren chi tieu do luong.
- Tinh diem tong hop 0-100 theo tung nhom thuc pham.
- Danh gia AI theo rui ro an toan (false-safe), khong chi accuracy.

## 2) Nhom chi tieu de thu thap

### Rau cu/qua (`produce`)
- `brix`
- `firmness_n`
- `color_index`
- `microbial_log_cfu_g`
- `storage_temp_c`

### Thit (`meat`)
- `ph`
- `drip_loss_pct`
- `tvb_n_mg_100g`
- `microbial_log_cfu_g`
- `storage_temp_c`

### Hai san (`fish`)
- `ph`
- `tvb_n_mg_100g`
- `microbial_log_cfu_g`
- `color_index`
- `storage_temp_c`

### Thi giac dinh luong (ap dung chung)
- `object_area_px`
- `damage_area_px`
- `spoilage_ratio_pct = 100 * damage_area_px/object_area_px`
- `reference_width_mm`, `reference_width_px` (neu can doi pixel -> mm)

## 3) Quy trinh gan nhan chuan

1. Lay mau theo lo va danh ma mau.
2. Do cac chi tieu tai phong kiem nghiem/bo test duoc hieu chuan.
3. Chuan hoa diem tung chi tieu ve thang 0-100.
4. Tong hop theo trong so theo nhom thuc pham.
5. Gan muc:
   - `fresh` >= 80
   - `good` >= 65
   - `moderate` >= 45
   - `expiring` < 45

## 3.1) Nguon tham chieu toi thieu (uy tin)

- EU Regulation (EC) No 2074/2005 (TVB-N cho nhom ca theo category species 25/30/35 mg N/100g):
  - https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32005R2074
- QCVN 8-3:2012/BYT (gioi han o nhiem vi sinh vat trong thuc pham):
  - https://nifc.gov.vn/files/media/202205/qcvn83-2012.pdf

Luu y: QCVN 8-3 dua ra chi tieu vi sinh theo nhom san pham/vi sinh vat cu the (n-c-m-M), khong phai mot nguong chung duy nhat cho "microbial_log_cfu_g".

## 4) KPI bao cao khuyen nghi

- Accuracy, Macro-F1, Weighted-F1
- MAE score (AI score vs score kiem dinh)
- Recall@Expiring
- False Safe Rate
- ECE (Expected Calibration Error)

## 5) Tich hop backend scan

`POST /api/scans` da ho tro:

- `commodity_group`
- `inspection_indicators` (JSON)

Ket qua tra ve:

- `assessment_basis`
- `quality_assessment`

Thong tin nay duoc luu de audit, retrain va doi chieu sau kiem dinh.

Nhanh visual tu dong:
- `assessment_basis = visual_spoilage_quantification_v1`
- `quality_assessment.areas` co:
  - `object_area_px`
  - `damage_area_px`
  - `spoilage_ratio_pct`
