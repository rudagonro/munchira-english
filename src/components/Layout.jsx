import Nav from './Nav'

export default function Layout({ children }) {
  return (
    <>
      <a className="skip-link" href="#main">Saltar al contenido</a>
      <Nav />
      <main id="main" tabIndex={-1}>{children}</main>
    </>
  )
}
