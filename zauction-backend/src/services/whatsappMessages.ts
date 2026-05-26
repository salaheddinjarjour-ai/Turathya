export const WHATSAPP_MESSAGES = {
    welcome: `مرحباً بك في تراثيا ✨
رحلة البحث عن الكنوز تبدأ الآن!
تصفّح المزادات`,
    normalAuctionOneHour: `مزاد جديد يلفت الأنظار 👀
لا تفوّت الفرصة
شاهده الآن!`,
    normalAuctionLive: `انطلقت المزايدة الآن!
اللحظات الأولى دائماً تحمل أفضل الفرص...
كن من أوائل المشاركين...`,
    featuredAuctionOneHour: `مزاد مميز بانتظارك ✨
القطعة نادرة والمنافسة تشتد
اكتشفه الآن!`,
    featuredAuctionLive: `انطلقت المنافسة! 🔥
جاءت فرصتك لاقتناء قطعة استثنائية
شارك الآن!`,
    wishlistUpdates: [
        `تحديث جديد على مزادك ⏳
السعر يتغير بسرعة
تابع الآن!`,
        `المنافسة تشتد 🔥
لا تفوّت فرصتك
ادخل المزاد...`,
        `هناك عرض جديد 👀
هل سترفع مزايدتك؟
شاهد التفاصيل...`
    ],
    collectionLaunch: `مجموعة جديدة وصلت ✨
العديد من التحف الاستثنائية بانتظارك
استكشف الآن!`,
    winner: `تهانينا! لقد فزت بالمزاد بنجاح 🎉
قطعتك الآن بانتظار استكمال الإجراءات لتصل إليك بكل أمان.
تواصل معنا.`
};

export function getWishlistMessageByIndex(index: number) {
    const messages = WHATSAPP_MESSAGES.wishlistUpdates;
    if (!messages.length) {
        return '';
    }

    const normalizedIndex = ((index % messages.length) + messages.length) % messages.length;
    return messages[normalizedIndex];
}
