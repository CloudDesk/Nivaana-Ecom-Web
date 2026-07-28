const assetBaseUrl =
  import.meta.env.VITE_ASSET_BASE_URL ||
  "https://storage.googleapis.com/nivaana-ecom-assets-prod/web/home";

const assetUrl = (fileName) => `${assetBaseUrl}/${fileName}`;

export const mediaAssets = {
  heroPrimaryPoster: assetUrl("Gemini_Generated_Image_3h8ozb3h8ozb3h8o.png"),
  heroSecondaryPoster: assetUrl("Gemini_Generated_Image_fmqf65fmqf65fmqf.png"),
  productFallback: assetUrl("Gemini_Generated_Image_fmqf65fmqf65fmqf.png"),
  homeFallbackProduct: assetUrl("Gemini_Generated_Image_3h8ozb3h8ozb3h8o.png"),
  carFreshenerCategoryDesktop: assetUrl("carfreshner_desktopview_categorycarousel.png"),
  carFreshenerCategoryMobile: assetUrl("carfreshner_mobileview_category_carousel.png"),
  fragranceBlendsCategory: assetUrl("Fragranceandblends.png"),
  kitchenAccessoriesCategory: assetUrl("kitchenaccessories.png"),
  heroVideoPrimary: assetUrl("i_need_a_video_for_the_hero_co.mp4"),
  heroVideoIncense: assetUrl("I_need_a_video_with_insence_st.mp4"),
  heroVideoLuxury: assetUrl("Need_to_genarate_a_video_in_la.mp4"),
  brandLogoGoogleYellow: assetUrl("new_brand_logo_google_yellow.png"),
};

export const {
  heroPrimaryPoster,
  heroSecondaryPoster,
  productFallback,
  homeFallbackProduct,
  carFreshenerCategoryDesktop,
  carFreshenerCategoryMobile,
  fragranceBlendsCategory,
  kitchenAccessoriesCategory,
  heroVideoPrimary,
  heroVideoIncense,
  heroVideoLuxury,
  brandLogoGoogleYellow,
} = mediaAssets;
