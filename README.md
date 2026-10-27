# لعبة شطرنج - Android (WebView)

## طريقة بناء ملف APK (خطوات بسيطة)

1. نزّل **Android Studio** (مجاني) من: https://developer.android.com/studio
2. افتح Android Studio → **Open** → اختر هاد المجلد (`android`).
3. خلّي Android Studio يخلص مزامنة Gradle (أول مرة بتنزّل Android SDK تلقائيًا، لازم إنترنت).
4. من القائمة: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
5. لما يخلص البناء، بيطلعلك إشعار فيه رابط **locate** يوديك على مكان الملف:
   `app/build/outputs/apk/debug/app-debug.apk`
6. انقل هاد الملف عموبايلك وثبّته (لازم تفعّل "تثبيت من مصادر غير معروفة" أول مرة).

### تشغيل مباشر على موبايل متوصل بالكمبيوتر
بدل الخطوة 4-6: وصّل الموبايل بالـ USB (وفعّل وضع المطوّر + تصحيح USB)، وبعدين اضغط زر **Run ▶** من Android Studio مباشرة.

### لو بدك تغيّر اسم التطبيق أو الحزمة
- اسم التطبيق: `app/src/main/res/values/strings.xml`
- معرّف الحزمة (applicationId): `app/build.gradle`

## بنية المشروع
- `app/src/main/assets/www/` — كامل اللعبة (HTML/CSS/JS) اللي بيعرضها الـ WebView.
- `app/src/main/java/.../MainActivity.java` — يفتح اللعبة بالـ WebView.
- باقي الملفات (manifest, gradle, icons) إعدادات أندرويد قياسية.

## ملاحظة
الكود جاهز 100% ومجرّب (محرك الشطرنج فيه كل القواعد: تبييت، أسر بالمرور، ترقية، كش ملك/مات، تعادل، وذكاء اصطناعي). الشي الوحيد المطلوب هو بناء الـ APK بـ Android Studio لأنه يحتاج Android SDK.
