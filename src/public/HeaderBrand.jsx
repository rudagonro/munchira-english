import { Link } from 'react-router-dom'
import mascot from '../assets/oruga-transparente.png.asset.json'
import './header-brand.css'

const mediaOrigin = 'https://id-preview--f553b302-239c-4b8c-bdfd-bae63f587a74.lovable.app'

export default function HeaderBrand() {
  return <Link to="/" className="mp-logo mp-header-brand" aria-label="Munchira English, inicio">
    <img src={`${mediaOrigin}${mascot.url}`} alt="" width="443" height="518" decoding="async" />
    <span className="mp-header-brand-name"><strong>MUNCHIRA</strong><span>English</span></span>
  </Link>
}
