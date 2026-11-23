import mascot from '../assets/oruga-transparente.png.asset.json'
import './footer-brand.css'

const mediaOrigin = 'https://id-preview--f553b302-239c-4b8c-bdfd-bae63f587a74.lovable.app'

export default function FooterBrand() {
  return <div className="mp-footer-brand">
    <img src={`${mediaOrigin}${mascot.url}`} alt="" width="443" height="518" loading="lazy" decoding="async" />
    <span className="mp-footer-brand-name"><strong>MUNCHIRA</strong><span>English</span></span>
  </div>
}
