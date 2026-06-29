-- =============================================================
-- REPLICA ESPEJO DE SAE GUADALAJARA (EMPRESA 05) - (210 TABLAS)
-- Generado automáticamente: 2026-06-29T17:50:57.136Z
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: acomp05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS acomp05 CASCADE;

CREATE TABLE acomp05 (
  cve_acomp INTEGER,
  cvta_com DOUBLE PRECISION,
  cdescto DOUBLE PRECISION,
  cdes_fin DOUBLE PRECISION,
  cimp DOUBLE PRECISION,
  ctot_ind DOUBLE PRECISION,
  rvta_com DOUBLE PRECISION,
  rdescto DOUBLE PRECISION,
  rdes_fin DOUBLE PRECISION,
  rimp DOUBLE PRECISION,
  rtot_ind DOUBLE PRECISION,
  ovta_com DOUBLE PRECISION,
  odescto DOUBLE PRECISION,
  odes_fin DOUBLE PRECISION,
  oimp DOUBLE PRECISION,
  qvta_com DOUBLE PRECISION,
  qdescto DOUBLE PRECISION,
  qdes_fin DOUBLE PRECISION,
  qimp DOUBLE PRECISION,
  dvta_com DOUBLE PRECISION,
  ddescto DOUBLE PRECISION,
  ddes_fin DOUBLE PRECISION,
  dimp DOUBLE PRECISION,
  dtot_ind DOUBLE PRECISION,
  per_acum TIMESTAMPTZ
);

ALTER TABLE acomp05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: actcam05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS actcam05 CASCADE;

CREATE TABLE actcam05 (
  cve_campania TEXT,
  cve_actividad TEXT,
  prioridad INTEGER,
  orden INTEGER
);

ALTER TABLE actcam05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: activi05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS activi05 CASCADE;

CREATE TABLE activi05 (
  cve_actividad TEXT,
  descr TEXT,
  prioridad INTEGER,
  status TEXT
);

ALTER TABLE activi05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: afact05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS afact05 CASCADE;

CREATE TABLE afact05 (
  cve_afact INTEGER,
  fvta_com DOUBLE PRECISION,
  fdescto DOUBLE PRECISION,
  fdes_fin DOUBLE PRECISION,
  fimp DOUBLE PRECISION,
  fcomi DOUBLE PRECISION,
  rvta_com DOUBLE PRECISION,
  rdescto DOUBLE PRECISION,
  rdes_fin DOUBLE PRECISION,
  rimp DOUBLE PRECISION,
  rcomi DOUBLE PRECISION,
  dvta_com DOUBLE PRECISION,
  ddescto DOUBLE PRECISION,
  ddes_fin DOUBLE PRECISION,
  dimp DOUBLE PRECISION,
  dcomi DOUBLE PRECISION,
  pvta_com DOUBLE PRECISION,
  pdescto DOUBLE PRECISION,
  pdes_fin DOUBLE PRECISION,
  pimp DOUBLE PRECISION,
  pcomi DOUBLE PRECISION,
  cvta_com DOUBLE PRECISION,
  cdescto DOUBLE PRECISION,
  cdes_fin DOUBLE PRECISION,
  cimp DOUBLE PRECISION,
  ccomi DOUBLE PRECISION,
  vvta_com DOUBLE PRECISION,
  vdescto DOUBLE PRECISION,
  vdes_fin DOUBLE PRECISION,
  vimp DOUBLE PRECISION,
  vcomi DOUBLE PRECISION,
  wvta_com DOUBLE PRECISION,
  wdescto DOUBLE PRECISION,
  wdes_fin DOUBLE PRECISION,
  wimp DOUBLE PRECISION,
  wcomi DOUBLE PRECISION,
  per_acum TIMESTAMPTZ,
  evta_com DOUBLE PRECISION,
  edescto DOUBLE PRECISION,
  edes_fin DOUBLE PRECISION,
  eimp DOUBLE PRECISION,
  ecomi DOUBLE PRECISION
);

ALTER TABLE afact05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: alerta05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS alerta05 CASCADE;

CREATE TABLE alerta05 (
  cve_alerta INTEGER,
  mensaje TEXT,
  cant_doc INTEGER
);

ALTER TABLE alerta05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: alerta_usuario05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS alerta_usuario05 CASCADE;

CREATE TABLE alerta_usuario05 (
  cve_alerta INTEGER,
  id_usuario INTEGER,
  activa TEXT,
  sig_fecha TIMESTAMPTZ,
  fecha_actual TIMESTAMPTZ
);

ALTER TABLE alerta_usuario05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: almacenes05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS almacenes05 CASCADE;

CREATE TABLE almacenes05 (
  cve_alm INTEGER,
  descr TEXT,
  direccion TEXT,
  encargado TEXT,
  telefono TEXT,
  lista_prec INTEGER,
  cuen_cont TEXT,
  cve_ment INTEGER,
  cve_msal INTEGER,
  status TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  ubi_dest TEXT,
  coi_sinc TIMESTAMPTZ
);

ALTER TABLE almacenes05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: autorizac05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS autorizac05 CASCADE;

CREATE TABLE autorizac05 (
  cve_aut INTEGER,
  docto_aut TEXT,
  num_aut TEXT,
  mes_venc INTEGER,
  anio_venc INTEGER
);

ALTER TABLE autorizac05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: autorizap05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS autorizap05 CASCADE;

CREATE TABLE autorizap05 (
  cve_aut INTEGER,
  docto_aut TEXT,
  num_aut TEXT,
  mes_venc INTEGER,
  anio_venc INTEGER
);

ALTER TABLE autorizap05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: bita05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS bita05 CASCADE;

CREATE TABLE bita05 (
  cve_bita INTEGER,
  cve_clie TEXT,
  cve_campania TEXT,
  cve_actividad TEXT,
  fechahora TIMESTAMPTZ,
  cve_usuario INTEGER,
  observaciones TEXT,
  status TEXT,
  nom_usuario TEXT
);

ALTER TABLE bita05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: camp05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS camp05 CASCADE;

CREATE TABLE camp05 (
  cve_campania TEXT,
  descrip TEXT,
  filtrar_auto TEXT,
  leyenda TEXT,
  status TEXT,
  fechad TIMESTAMPTZ,
  fechah TIMESTAMPTZ,
  origen TEXT,
  tipo TEXT
);

ALTER TABLE camp05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: campfil05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS campfil05 CASCADE;

CREATE TABLE campfil05 (
  cve_campania TEXT,
  cmb_vigencia INTEGER,
  criterios_clien INTEGER,
  clie_desde TEXT,
  clie_hasta TEXT,
  clasificacion TEXT,
  vendedor TEXT,
  zona TEXT,
  estatus TEXT,
  cmb_venta_anual INTEGER,
  venta_anual DOUBLE PRECISION,
  cmb_descuento INTEGER,
  descuento DOUBLE PRECISION,
  cmb_saldo INTEGER,
  saldo DOUBLE PRECISION,
  chk_limite TEXT,
  cmb_porcentaje_lim INTEGER,
  cmb_dias_cartera INTEGER,
  dias INTEGER,
  chk_dias INTEGER,
  cmb_dias_credito INTEGER,
  fech_inicial_ultcompr TIMESTAMPTZ,
  fech_final_ultcompr TIMESTAMPTZ,
  cmb_ultimacompra INTEGER,
  fech_inicial_aplic TIMESTAMPTZ,
  fech_final_aplic TIMESTAMPTZ,
  cmb_aplic INTEGER,
  docs_desde TEXT,
  docs_hasta TEXT,
  folios_desde TEXT,
  folios_hasta TEXT,
  conceptos TEXT,
  periodo TEXT,
  fech_periodo_inicial TIMESTAMPTZ,
  fech_periodo_final TIMESTAMPTZ,
  cmb_periodo INTEGER,
  tipoventa INTEGER,
  ventas_desde TEXT,
  ventas_hasta TEXT,
  ventas_vendedor TEXT,
  ventas_moneda TEXT,
  ventas_almacen TEXT,
  ventas_fech_inicial TIMESTAMPTZ,
  ventas_fech_final TIMESTAMPTZ,
  cmb_ventas INTEGER,
  chk_cancelaciones TEXT,
  cmb_importe_venta INTEGER,
  importe_venta DOUBLE PRECISION,
  prod_desde TEXT,
  prod_hasta TEXT,
  prod_linea TEXT,
  inv_prod TEXT,
  inv_grupop TEXT,
  inv_kits TEXT,
  inv_serv TEXT,
  cmb_cantidad INTEGER,
  inv_cant DOUBLE PRECISION,
  guia TEXT
);

ALTER TABLE campfil05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: capas_x_mov05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS capas_x_mov05 CASCADE;

CREATE TABLE capas_x_mov05 (
  cve_art TEXT,
  num_mov INTEGER,
  num_mov_aft INTEGER,
  cant_aft DOUBLE PRECISION,
  costo_aft DOUBLE PRECISION
);

ALTER TABLE capas_x_mov05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: cartaporte05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS cartaporte05 CASCADE;

CREATE TABLE cartaporte05 (
  clave_doc TEXT,
  tipo_doc TEXT,
  xml_complemento TEXT
);

ALTER TABLE cartaporte05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: cfdi05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS cfdi05 CASCADE;

CREATE TABLE cfdi05 (
  tipo_doc TEXT,
  cve_doc TEXT,
  version TEXT,
  uuid TEXT,
  no_serie TEXT,
  fecha_cert TEXT,
  fecha_cancela TEXT,
  xml_doc TEXT,
  xml_doc_cancela TEXT,
  desgloceimp1 TEXT,
  desgloceimp2 TEXT,
  desgloceimp3 TEXT,
  desgloceimp4 TEXT,
  msj_canc TEXT,
  pendiente TEXT,
  cve_usuario INTEGER,
  motivo_canc TEXT,
  uuid_rel TEXT,
  desgloceimp8 TEXT,
  desgloceimp7 TEXT,
  desgloceimp6 TEXT,
  desgloceimp5 TEXT,
  en_tablero TEXT
);

ALTER TABLE cfdi05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: cfdic05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS cfdic05 CASCADE;

CREATE TABLE cfdic05 (
  tipo_doc TEXT,
  cve_doc TEXT,
  id_timbrado TEXT,
  fecha_timbrado TEXT,
  folio_timbrado TEXT,
  serie_timbrado TEXT,
  rfc_emisor TEXT,
  rfc_receptor TEXT,
  monto DOUBLE PRECISION,
  xml_doc TEXT,
  xml_acuse TEXT,
  respuesta TEXT,
  version TEXT,
  importacion TEXT
);

ALTER TABLE cfdic05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: cfdi_rel05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS cfdi_rel05 CASCADE;

CREATE TABLE cfdi_rel05 (
  uuid TEXT,
  tip_rel TEXT,
  cve_doc TEXT,
  cve_doc_rel TEXT,
  tip_doc TEXT,
  no_serie TEXT,
  folio TEXT,
  fecha_cert TEXT
);

ALTER TABLE cfdi_rel05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: cfglin05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS cfglin05 CASCADE;

CREATE TABLE cfglin05 (
  cve_lin TEXT,
  long1 INTEGER,
  sep1 TEXT,
  long2 INTEGER,
  sep2 TEXT,
  long3 INTEGER
);

ALTER TABLE cfglin05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: citas05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS citas05 CASCADE;

CREATE TABLE citas05 (
  cve_clie TEXT,
  asunto TEXT,
  id_outlook TEXT,
  fecha_hora TIMESTAMPTZ,
  status TEXT,
  usuario TEXT,
  cve_cita INTEGER
);

ALTER TABLE citas05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: clicam05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS clicam05 CASCADE;

CREATE TABLE clicam05 (
  cve_campania TEXT,
  cve_clie TEXT,
  cve_actividad TEXT,
  cve_resultado TEXT,
  fecha TIMESTAMPTZ,
  prioridad INTEGER,
  status TEXT,
  comentarios TEXT,
  status_actividad INTEGER
);

ALTER TABLE clicam05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: clie05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS clie05 CASCADE;

CREATE TABLE clie05 (
  clave TEXT,
  status TEXT,
  nombre TEXT,
  rfc TEXT,
  calle TEXT,
  numint TEXT,
  numext TEXT,
  cruzamientos TEXT,
  cruzamientos2 TEXT,
  colonia TEXT,
  codigo TEXT,
  localidad TEXT,
  municipio TEXT,
  estado TEXT,
  pais TEXT,
  nacionalidad TEXT,
  referdir TEXT,
  telefono TEXT,
  clasific TEXT,
  fax TEXT,
  pag_web TEXT,
  curp TEXT,
  cve_zona TEXT,
  imprir TEXT,
  mail TEXT,
  nivelsec INTEGER,
  enviosilen TEXT,
  emailpred TEXT,
  diarev TEXT,
  diapago TEXT,
  con_credito TEXT,
  diascred INTEGER,
  limcred DOUBLE PRECISION,
  saldo DOUBLE PRECISION,
  lista_prec INTEGER,
  cve_bita INTEGER,
  ult_pagod TEXT,
  ult_pagom DOUBLE PRECISION,
  ult_pagof TIMESTAMPTZ,
  descuento DOUBLE PRECISION,
  ult_ventad TEXT,
  ult_compm DOUBLE PRECISION,
  fch_ultcom TIMESTAMPTZ,
  ventas DOUBLE PRECISION,
  cve_vend TEXT,
  cve_obs INTEGER,
  tipo_empresa TEXT,
  matriz TEXT,
  prospecto TEXT,
  calle_envio TEXT,
  numint_envio TEXT,
  numext_envio TEXT,
  cruzamientos_envio TEXT,
  cruzamientos_envio2 TEXT,
  colonia_envio TEXT,
  localidad_envio TEXT,
  municipio_envio TEXT,
  estado_envio TEXT,
  pais_envio TEXT,
  codigo_envio TEXT,
  cve_zona_envio TEXT,
  referencia_envio TEXT,
  cuenta_contable TEXT,
  addendaf TEXT,
  addendad TEXT,
  namespace TEXT,
  metododepago TEXT,
  numctapago TEXT,
  modelo TEXT,
  des_impu1 TEXT,
  des_impu2 TEXT,
  des_impu3 TEXT,
  des_impu4 TEXT,
  des_per TEXT,
  lat_general DOUBLE PRECISION,
  lon_general DOUBLE PRECISION,
  lat_envio DOUBLE PRECISION,
  lon_envio DOUBLE PRECISION,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  uso_cfdi TEXT,
  cve_pais_sat TEXT,
  numidregfiscal TEXT,
  formadepagosat TEXT,
  addendag TEXT,
  addendae TEXT,
  addendat TEXT,
  ubicacion_r TEXT,
  reg_fisc TEXT,
  val_rfc INTEGER,
  nombrecomercial TEXT,
  des_impu8 TEXT,
  des_impu7 TEXT,
  des_impu6 TEXT,
  des_impu5 TEXT,
  coi_sinc TIMESTAMPTZ,
  cuenta_contable2 TEXT,
  status_rfc_ln TEXT
);

ALTER TABLE clie05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: clie_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS clie_clib05 CASCADE;

CREATE TABLE clie_clib05 (
  cve_clie TEXT,
  camplib1 TEXT,
  camplib2 TEXT,
  camplib3 TEXT,
  camplib4 INTEGER,
  camplib5 DOUBLE PRECISION,
  camplib6 DOUBLE PRECISION,
  camplib7 TEXT,
  camplib8 TEXT
);

ALTER TABLE clie_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: clie_tienda05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS clie_tienda05 CASCADE;

CREATE TABLE clie_tienda05 (
  cve_comp TEXT,
  clave TEXT,
  cve_tienda TEXT
);

ALTER TABLE clie_tienda05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: clin05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS clin05 CASCADE;

CREATE TABLE clin05 (
  cve_lin TEXT,
  desc_lin TEXT,
  esungpo TEXT,
  cuenta_coi TEXT,
  status TEXT,
  coi_sinc TIMESTAMPTZ,
  uuid TEXT
);

ALTER TABLE clin05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: cnsest05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS cnsest05 CASCADE;

CREATE TABLE cnsest05 (
  cve_estad INTEGER,
  titulo TEXT,
  usuario INTEGER,
  fecha TIMESTAMPTZ,
  tipo TEXT,
  archivo TEXT,
  ver_filtro TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  disponible_movil TEXT
);

ALTER TABLE cnsest05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: coi_xml05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS coi_xml05 CASCADE;

CREATE TABLE coi_xml05 (
  ctlcoi INTEGER,
  fecha_sinc TIMESTAMPTZ,
  id_sinc TEXT,
  xml_doc TEXT,
  tipo_doc TEXT,
  status TEXT,
  fecha_doc TIMESTAMPTZ,
  cve_doc TEXT,
  uuid TEXT,
  observ TEXT
);

ALTER TABLE coi_xml05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: color05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS color05 CASCADE;

CREATE TABLE color05 (
  cve_lin TEXT,
  valor TEXT,
  descrip TEXT
);

ALTER TABLE color05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: compactacion05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS compactacion05 CASCADE;

CREATE TABLE compactacion05 (
  ult_compactacion TIMESTAMPTZ
);

ALTER TABLE compactacion05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: compc05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS compc05 CASCADE;

CREATE TABLE compc05 (
  tip_doc TEXT,
  cve_doc TEXT,
  cve_clpv TEXT,
  status TEXT,
  su_refer TEXT,
  fecha_doc TIMESTAMPTZ,
  fecha_rec TIMESTAMPTZ,
  fecha_pag TIMESTAMPTZ,
  fecha_cancela TIMESTAMPTZ,
  can_tot DOUBLE PRECISION,
  imp_tot1 DOUBLE PRECISION,
  imp_tot2 DOUBLE PRECISION,
  imp_tot3 DOUBLE PRECISION,
  imp_tot4 DOUBLE PRECISION,
  des_tot DOUBLE PRECISION,
  des_fin DOUBLE PRECISION,
  tot_ind DOUBLE PRECISION,
  obs_cond TEXT,
  cve_obs INTEGER,
  num_alma INTEGER,
  act_cxp TEXT,
  act_coi TEXT,
  enlazado TEXT,
  tip_doc_e TEXT,
  num_moned INTEGER,
  tipcamb DOUBLE PRECISION,
  num_pagos INTEGER,
  fechaelab TIMESTAMPTZ,
  serie TEXT,
  folio INTEGER,
  ctlpol INTEGER,
  escfd TEXT,
  contado TEXT,
  bloq TEXT,
  des_fin_porc DOUBLE PRECISION,
  des_tot_porc DOUBLE PRECISION,
  importe DOUBLE PRECISION,
  tip_doc_ant TEXT,
  doc_ant TEXT,
  tip_doc_sig TEXT,
  doc_sig TEXT,
  formaenvio TEXT,
  metododepago TEXT,
  imp_tot8 DOUBLE PRECISION,
  imp_tot7 DOUBLE PRECISION,
  imp_tot6 DOUBLE PRECISION,
  imp_tot5 DOUBLE PRECISION,
  ctlcoi INTEGER
);

ALTER TABLE compc05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: compc_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS compc_clib05 CASCADE;

CREATE TABLE compc_clib05 (
  clave_doc TEXT
);

ALTER TABLE compc_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: compd05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS compd05 CASCADE;

CREATE TABLE compd05 (
  tip_doc TEXT,
  cve_doc TEXT,
  cve_clpv TEXT,
  status TEXT,
  su_refer TEXT,
  fecha_doc TIMESTAMPTZ,
  fecha_rec TIMESTAMPTZ,
  fecha_pag TIMESTAMPTZ,
  fecha_cancela TIMESTAMPTZ,
  can_tot DOUBLE PRECISION,
  imp_tot1 DOUBLE PRECISION,
  imp_tot2 DOUBLE PRECISION,
  imp_tot3 DOUBLE PRECISION,
  imp_tot4 DOUBLE PRECISION,
  des_tot DOUBLE PRECISION,
  des_fin DOUBLE PRECISION,
  tot_ind DOUBLE PRECISION,
  obs_cond TEXT,
  cve_obs INTEGER,
  num_alma INTEGER,
  act_cxp TEXT,
  act_coi TEXT,
  enlazado TEXT,
  tip_doc_e TEXT,
  num_moned INTEGER,
  tipcamb DOUBLE PRECISION,
  num_pagos INTEGER,
  fechaelab TIMESTAMPTZ,
  serie TEXT,
  folio INTEGER,
  ctlpol INTEGER,
  escfd TEXT,
  contado TEXT,
  bloq TEXT,
  des_fin_porc DOUBLE PRECISION,
  des_tot_porc DOUBLE PRECISION,
  importe DOUBLE PRECISION,
  tip_doc_ant TEXT,
  doc_ant TEXT,
  tip_doc_sig TEXT,
  doc_sig TEXT,
  formaenvio TEXT,
  metododepago TEXT,
  imp_tot8 DOUBLE PRECISION,
  imp_tot7 DOUBLE PRECISION,
  imp_tot6 DOUBLE PRECISION,
  imp_tot5 DOUBLE PRECISION,
  ctlcoi INTEGER
);

ALTER TABLE compd05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: compd_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS compd_clib05 CASCADE;

CREATE TABLE compd_clib05 (
  clave_doc TEXT
);

ALTER TABLE compd_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: compo05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS compo05 CASCADE;

CREATE TABLE compo05 (
  tip_doc TEXT,
  cve_doc TEXT,
  cve_clpv TEXT,
  status TEXT,
  su_refer TEXT,
  fecha_doc TIMESTAMPTZ,
  fecha_rec TIMESTAMPTZ,
  fecha_pag TIMESTAMPTZ,
  fecha_cancela TIMESTAMPTZ,
  can_tot DOUBLE PRECISION,
  imp_tot1 DOUBLE PRECISION,
  imp_tot2 DOUBLE PRECISION,
  imp_tot3 DOUBLE PRECISION,
  imp_tot4 DOUBLE PRECISION,
  des_tot DOUBLE PRECISION,
  des_fin DOUBLE PRECISION,
  tot_ind DOUBLE PRECISION,
  obs_cond TEXT,
  cve_obs INTEGER,
  num_alma INTEGER,
  act_cxp TEXT,
  act_coi TEXT,
  num_moned INTEGER,
  tipcamb DOUBLE PRECISION,
  enlazado TEXT,
  tip_doc_e TEXT,
  num_pagos INTEGER,
  fechaelab TIMESTAMPTZ,
  serie TEXT,
  folio INTEGER,
  ctlpol INTEGER,
  escfd TEXT,
  contado TEXT,
  bloq TEXT,
  des_fin_porc DOUBLE PRECISION,
  des_tot_porc DOUBLE PRECISION,
  importe DOUBLE PRECISION,
  tip_doc_ant TEXT,
  doc_ant TEXT,
  tip_doc_sig TEXT,
  doc_sig TEXT,
  formaenvio TEXT,
  metododepago TEXT,
  imp_tot8 DOUBLE PRECISION,
  imp_tot7 DOUBLE PRECISION,
  imp_tot6 DOUBLE PRECISION,
  imp_tot5 DOUBLE PRECISION,
  ctlcoi INTEGER
);

ALTER TABLE compo05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: compo_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS compo_clib05 CASCADE;

CREATE TABLE compo_clib05 (
  clave_doc TEXT
);

ALTER TABLE compo_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: compq05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS compq05 CASCADE;

CREATE TABLE compq05 (
  tip_doc TEXT,
  cve_doc TEXT,
  cve_clpv TEXT,
  status TEXT,
  su_refer TEXT,
  fecha_doc TIMESTAMPTZ,
  fecha_rec TIMESTAMPTZ,
  fecha_pag TIMESTAMPTZ,
  fecha_cancela TIMESTAMPTZ,
  can_tot DOUBLE PRECISION,
  imp_tot1 DOUBLE PRECISION,
  imp_tot2 DOUBLE PRECISION,
  imp_tot3 DOUBLE PRECISION,
  imp_tot4 DOUBLE PRECISION,
  des_tot DOUBLE PRECISION,
  des_fin DOUBLE PRECISION,
  tot_ind DOUBLE PRECISION,
  obs_cond TEXT,
  cve_obs INTEGER,
  num_alma INTEGER,
  act_cxp TEXT,
  act_coi TEXT,
  enlazado TEXT,
  tip_doc_e TEXT,
  num_moned INTEGER,
  tipcamb DOUBLE PRECISION,
  num_pagos INTEGER,
  fechaelab TIMESTAMPTZ,
  serie TEXT,
  folio INTEGER,
  ctlpol INTEGER,
  escfd TEXT,
  contado TEXT,
  bloq TEXT,
  des_fin_porc DOUBLE PRECISION,
  des_tot_porc DOUBLE PRECISION,
  importe DOUBLE PRECISION,
  tip_doc_ant TEXT,
  doc_ant TEXT,
  tip_doc_sig TEXT,
  doc_sig TEXT,
  formaenvio TEXT,
  metododepago TEXT,
  imp_tot8 DOUBLE PRECISION,
  imp_tot7 DOUBLE PRECISION,
  imp_tot6 DOUBLE PRECISION,
  imp_tot5 DOUBLE PRECISION,
  ctlcoi INTEGER
);

ALTER TABLE compq05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: compq_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS compq_clib05 CASCADE;

CREATE TABLE compq_clib05 (
  clave_doc TEXT
);

ALTER TABLE compq_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: compr05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS compr05 CASCADE;

CREATE TABLE compr05 (
  tip_doc TEXT,
  cve_doc TEXT,
  cve_clpv TEXT,
  status TEXT,
  su_refer TEXT,
  fecha_doc TIMESTAMPTZ,
  fecha_rec TIMESTAMPTZ,
  fecha_pag TIMESTAMPTZ,
  fecha_cancela TIMESTAMPTZ,
  can_tot DOUBLE PRECISION,
  imp_tot1 DOUBLE PRECISION,
  imp_tot2 DOUBLE PRECISION,
  imp_tot3 DOUBLE PRECISION,
  imp_tot4 DOUBLE PRECISION,
  des_tot DOUBLE PRECISION,
  des_fin DOUBLE PRECISION,
  tot_ind DOUBLE PRECISION,
  obs_cond TEXT,
  cve_obs INTEGER,
  num_alma INTEGER,
  act_cxp TEXT,
  act_coi TEXT,
  enlazado TEXT,
  tip_doc_e TEXT,
  num_moned INTEGER,
  tipcamb DOUBLE PRECISION,
  num_pagos INTEGER,
  fechaelab TIMESTAMPTZ,
  serie TEXT,
  folio INTEGER,
  ctlpol INTEGER,
  escfd TEXT,
  contado TEXT,
  bloq TEXT,
  des_fin_porc DOUBLE PRECISION,
  des_tot_porc DOUBLE PRECISION,
  importe DOUBLE PRECISION,
  tip_doc_ant TEXT,
  doc_ant TEXT,
  tip_doc_sig TEXT,
  doc_sig TEXT,
  formaenvio TEXT,
  metododepago TEXT,
  imp_tot5 DOUBLE PRECISION,
  imp_tot8 DOUBLE PRECISION,
  imp_tot7 DOUBLE PRECISION,
  imp_tot6 DOUBLE PRECISION,
  ctlcoi INTEGER
);

ALTER TABLE compr05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: compr_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS compr_clib05 CASCADE;

CREATE TABLE compr_clib05 (
  clave_doc TEXT
);

ALTER TABLE compr_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: com_exterior05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS com_exterior05 CASCADE;

CREATE TABLE com_exterior05 (
  clave_doc TEXT,
  tipo_doc TEXT,
  xml_complemento TEXT
);

ALTER TABLE com_exterior05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: conc05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS conc05 CASCADE;

CREATE TABLE conc05 (
  num_cpto INTEGER,
  descr TEXT,
  tipo TEXT,
  cuen_cont TEXT,
  con_refer TEXT,
  gen_cpto INTEGER,
  autorizacion TEXT,
  signo INTEGER,
  es_fma_pag TEXT,
  cve_bita INTEGER,
  status TEXT,
  enlinea INTEGER,
  dar_cambio TEXT,
  uuid TEXT,
  formadepagosat TEXT,
  version_sinc TIMESTAMPTZ,
  config_codi TEXT
);

ALTER TABLE conc05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: config_envios05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS config_envios05 CASCADE;

CREATE TABLE config_envios05 (
  cve_art TEXT,
  num_env INTEGER,
  descr TEXT,
  costo DOUBLE PRECISION
);

ALTER TABLE config_envios05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: conm05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS conm05 CASCADE;

CREATE TABLE conm05 (
  cve_cpto INTEGER,
  descr TEXT,
  cpn TEXT,
  cuen_cont TEXT,
  tipo_mov TEXT,
  status TEXT,
  signo INTEGER
);

ALTER TABLE conm05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: conp05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS conp05 CASCADE;

CREATE TABLE conp05 (
  num_cpto INTEGER,
  descr TEXT,
  tipo TEXT,
  cuen_cont TEXT,
  con_refer TEXT,
  gen_cpto INTEGER,
  autorizacion TEXT,
  signo INTEGER,
  es_fma_pag TEXT,
  cve_bita INTEGER,
  status TEXT,
  formadepagosat TEXT
);

ALTER TABLE conp05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: cons_per05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS cons_per05 CASCADE;

CREATE TABLE cons_per05 (
  cve_cons INTEGER,
  titulo TEXT,
  usuario INTEGER,
  tipo INTEGER,
  archivo TEXT
);

ALTER TABLE cons_per05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: contac05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS contac05 CASCADE;

CREATE TABLE contac05 (
  cve_clie TEXT,
  ncontacto INTEGER,
  nombre TEXT,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  tipocontac TEXT,
  status TEXT,
  usuario TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  subtipocont TEXT,
  tip_fig TEXT
);

ALTER TABLE contac05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: contap05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS contap05 CASCADE;

CREATE TABLE contap05 (
  ncontacto INTEGER,
  cve_prov TEXT,
  nombre TEXT,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  tipocontac TEXT,
  status TEXT,
  usuario TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  subtipocont TEXT
);

ALTER TABLE contap05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: ctaesq05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS ctaesq05 CASCADE;

CREATE TABLE ctaesq05 (
  num_impu INTEGER,
  porcentaje DOUBLE PRECISION,
  cuen_vent TEXT,
  cuen_comp TEXT
);

ALTER TABLE ctaesq05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: ctrlbloqueo05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS ctrlbloqueo05 CASCADE;

CREATE TABLE ctrlbloqueo05 (
  usuarios INTEGER,
  bloqueada TEXT
);

ALTER TABLE ctrlbloqueo05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: ctrl_elimina05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS ctrl_elimina05 CASCADE;

CREATE TABLE ctrl_elimina05 (
  tabla TEXT,
  uuid_reg TEXT,
  version_sinc TIMESTAMPTZ,
  uuid TEXT
);

ALTER TABLE ctrl_elimina05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: cuenta_benef05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS cuenta_benef05 CASCADE;

CREATE TABLE cuenta_benef05 (
  cuenta_bancaria TEXT,
  rfc_banco TEXT,
  nombre_banco TEXT,
  clave TEXT
);

ALTER TABLE cuenta_benef05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: cuenta_ord05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS cuenta_ord05 CASCADE;

CREATE TABLE cuenta_ord05 (
  cuenta_bancaria TEXT,
  rfc_banco TEXT,
  nombre_banco TEXT,
  clave TEXT
);

ALTER TABLE cuenta_ord05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: cuen_det05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS cuen_det05 CASCADE;

CREATE TABLE cuen_det05 (
  cve_clie TEXT,
  refer TEXT,
  id_mov INTEGER,
  num_cpto INTEGER,
  num_cargo INTEGER,
  cve_obs INTEGER,
  no_factura TEXT,
  docto TEXT,
  importe DOUBLE PRECISION,
  fecha_apli TIMESTAMPTZ,
  fecha_venc TIMESTAMPTZ,
  afec_coi TEXT,
  strcvevend TEXT,
  num_moned INTEGER,
  tcambio DOUBLE PRECISION,
  impmon_ext DOUBLE PRECISION,
  fechaelab TIMESTAMPTZ,
  ctlpol INTEGER,
  cve_folio TEXT,
  tipo_mov TEXT,
  cve_bita INTEGER,
  signo INTEGER,
  cve_aut INTEGER,
  usuario INTEGER,
  operacionpl TEXT,
  ref_sist TEXT,
  no_partida INTEGER,
  refbanco_origen TEXT,
  refbanco_dest TEXT,
  numctapago_origen TEXT,
  numctapago_destino TEXT,
  numcheque TEXT,
  beneficiario TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  id_operacion TEXT,
  cve_doc_comppago TEXT,
  usuariogl INTEGER,
  ctlcoi INTEGER,
  cta_banca_destino TEXT,
  cta_banca_clie TEXT
);

ALTER TABLE cuen_det05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: cuen_m05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS cuen_m05 CASCADE;

CREATE TABLE cuen_m05 (
  cve_clie TEXT,
  refer TEXT,
  num_cpto INTEGER,
  num_cargo INTEGER,
  cve_obs INTEGER,
  no_factura TEXT,
  docto TEXT,
  importe DOUBLE PRECISION,
  fecha_apli TIMESTAMPTZ,
  fecha_venc TIMESTAMPTZ,
  afec_coi TEXT,
  strcvevend TEXT,
  num_moned INTEGER,
  tcambio DOUBLE PRECISION,
  impmon_ext DOUBLE PRECISION,
  fechaelab TIMESTAMPTZ,
  ctlpol INTEGER,
  cve_folio TEXT,
  tipo_mov TEXT,
  cve_bita INTEGER,
  signo INTEGER,
  cve_aut INTEGER,
  usuario INTEGER,
  entregada TEXT,
  fecha_entrega TIMESTAMPTZ,
  status TEXT,
  ref_sist TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  usuariogl INTEGER,
  ctlcoi INTEGER,
  modulo TEXT
);

ALTER TABLE cuen_m05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: cves_alter05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS cves_alter05 CASCADE;

CREATE TABLE cves_alter05 (
  cve_art TEXT,
  cve_alter TEXT,
  tipo TEXT,
  cve_clpv TEXT
);

ALTER TABLE cves_alter05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: desact05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS desact05 CASCADE;

CREATE TABLE desact05 (
  cve_campania TEXT,
  cve_actividad TEXT,
  descr TEXT
);

ALTER TABLE desact05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: doctosigc05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS doctosigc05 CASCADE;

CREATE TABLE doctosigc05 (
  tip_doc TEXT,
  cve_doc TEXT,
  ant_sig TEXT,
  tip_doc_e TEXT,
  cve_doc_e TEXT,
  partida INTEGER,
  part_e INTEGER,
  cant_e DOUBLE PRECISION
);

ALTER TABLE doctosigc05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: doctosigf05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS doctosigf05 CASCADE;

CREATE TABLE doctosigf05 (
  tip_doc TEXT,
  cve_doc TEXT,
  ant_sig TEXT,
  tip_doc_e TEXT,
  cve_doc_e TEXT,
  partida INTEGER,
  part_e INTEGER,
  cant_e DOUBLE PRECISION
);

ALTER TABLE doctosigf05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: doctosigfc05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS doctosigfc05 CASCADE;

CREATE TABLE doctosigfc05 (
  tip_doc TEXT,
  cve_doc TEXT,
  ant_sig TEXT,
  tip_doc_e TEXT,
  cve_doc_e TEXT,
  partida INTEGER,
  part_e INTEGER,
  cant_e DOUBLE PRECISION
);

ALTER TABLE doctosigfc05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: enlacefc05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS enlacefc05 CASCADE;

CREATE TABLE enlacefc05 (
  tip_doc TEXT,
  cve_doc TEXT,
  ant_sig TEXT,
  tip_doc_e TEXT,
  cve_doc_e TEXT
);

ALTER TABLE enlacefc05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: enlace_ltpd05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS enlace_ltpd05 CASCADE;

CREATE TABLE enlace_ltpd05 (
  e_ltpd INTEGER,
  reg_ltpd INTEGER,
  cantidad DOUBLE PRECISION,
  pxrs DOUBLE PRECISION
);

ALTER TABLE enlace_ltpd05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: facta05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS facta05 CASCADE;

CREATE TABLE facta05 (
  tip_doc TEXT,
  cve_doc TEXT,
  cve_clpv TEXT,
  status TEXT,
  dat_mostr INTEGER,
  cve_vend TEXT,
  cve_pedi TEXT,
  fecha_doc TIMESTAMPTZ,
  fecha_ent TIMESTAMPTZ,
  fecha_ven TIMESTAMPTZ,
  fecha_cancela TIMESTAMPTZ,
  can_tot DOUBLE PRECISION,
  imp_tot1 DOUBLE PRECISION,
  imp_tot2 DOUBLE PRECISION,
  imp_tot3 DOUBLE PRECISION,
  imp_tot4 DOUBLE PRECISION,
  des_tot DOUBLE PRECISION,
  des_fin DOUBLE PRECISION,
  com_tot DOUBLE PRECISION,
  condicion TEXT,
  cve_obs INTEGER,
  num_alma INTEGER,
  act_cxc TEXT,
  act_coi TEXT,
  enlazado TEXT,
  tip_doc_e TEXT,
  num_moned INTEGER,
  tipcamb DOUBLE PRECISION,
  num_pagos INTEGER,
  fechaelab TIMESTAMPTZ,
  primerpago DOUBLE PRECISION,
  rfc TEXT,
  ctlpol INTEGER,
  escfd TEXT,
  autoriza INTEGER,
  serie TEXT,
  folio INTEGER,
  autoanio TEXT,
  dat_envio INTEGER,
  contado TEXT,
  cve_bita INTEGER,
  bloq TEXT,
  formaenvio TEXT,
  des_fin_porc DOUBLE PRECISION,
  des_tot_porc DOUBLE PRECISION,
  importe DOUBLE PRECISION,
  com_tot_porc DOUBLE PRECISION,
  metododepago TEXT,
  numctapago TEXT,
  tip_doc_ant TEXT,
  doc_ant TEXT,
  tip_doc_sig TEXT,
  doc_sig TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  formadepagosat TEXT,
  uso_cfdi TEXT,
  num_alm_des INTEGER,
  tip_traslado TEXT,
  reg_fisc TEXT,
  tip_fac TEXT,
  imp_tot8 DOUBLE PRECISION,
  imp_tot7 DOUBLE PRECISION,
  imp_tot6 DOUBLE PRECISION,
  imp_tot5 DOUBLE PRECISION
);

ALTER TABLE facta05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: facta_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS facta_clib05 CASCADE;

CREATE TABLE facta_clib05 (
  clave_doc TEXT
);

ALTER TABLE facta_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: factc05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS factc05 CASCADE;

CREATE TABLE factc05 (
  tip_doc TEXT,
  cve_doc TEXT,
  cve_clpv TEXT,
  status TEXT,
  cve_pedi TEXT,
  fecha_doc TIMESTAMPTZ,
  fecha_ent TIMESTAMPTZ,
  fecha_ven TIMESTAMPTZ,
  imp_tot1 DOUBLE PRECISION,
  imp_tot2 DOUBLE PRECISION,
  imp_tot3 DOUBLE PRECISION,
  imp_tot4 DOUBLE PRECISION,
  des_fin DOUBLE PRECISION,
  com_tot DOUBLE PRECISION,
  num_moned INTEGER,
  tipcamb DOUBLE PRECISION,
  primerpago DOUBLE PRECISION,
  rfc TEXT,
  autoriza INTEGER,
  folio INTEGER,
  serie TEXT,
  autoanio TEXT,
  escfd TEXT,
  num_alma INTEGER,
  act_cxc TEXT,
  act_coi TEXT,
  can_tot DOUBLE PRECISION,
  cve_vend TEXT,
  fecha_cancela TIMESTAMPTZ,
  des_tot DOUBLE PRECISION,
  condicion TEXT,
  num_pagos INTEGER,
  dat_envio INTEGER,
  contado TEXT,
  dat_mostr INTEGER,
  cve_bita INTEGER,
  bloq TEXT,
  fechaelab TIMESTAMPTZ,
  ctlpol INTEGER,
  cve_obs INTEGER,
  enlazado TEXT,
  tip_doc_e TEXT,
  formaenvio TEXT,
  des_fin_porc DOUBLE PRECISION,
  des_tot_porc DOUBLE PRECISION,
  importe DOUBLE PRECISION,
  com_tot_porc DOUBLE PRECISION,
  metododepago TEXT,
  numctapago TEXT,
  tip_doc_ant TEXT,
  doc_ant TEXT,
  tip_doc_sig TEXT,
  doc_sig TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  formadepagosat TEXT,
  uso_cfdi TEXT,
  tip_traslado TEXT,
  num_alm_des INTEGER,
  imp_tot5 DOUBLE PRECISION,
  imp_tot6 DOUBLE PRECISION,
  imp_tot7 DOUBLE PRECISION,
  reg_fisc TEXT,
  tip_fac TEXT,
  imp_tot8 DOUBLE PRECISION,
  ctlcoi INTEGER
);

ALTER TABLE factc05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: factc_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS factc_clib05 CASCADE;

CREATE TABLE factc_clib05 (
  clave_doc TEXT
);

ALTER TABLE factc_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: factd05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS factd05 CASCADE;

CREATE TABLE factd05 (
  tip_doc TEXT,
  cve_doc TEXT,
  cve_clpv TEXT,
  status TEXT,
  cve_vend TEXT,
  cve_pedi TEXT,
  fecha_doc TIMESTAMPTZ,
  fecha_ent TIMESTAMPTZ,
  fecha_ven TIMESTAMPTZ,
  fecha_cancela TIMESTAMPTZ,
  can_tot DOUBLE PRECISION,
  imp_tot1 DOUBLE PRECISION,
  imp_tot2 DOUBLE PRECISION,
  imp_tot3 DOUBLE PRECISION,
  imp_tot4 DOUBLE PRECISION,
  des_tot DOUBLE PRECISION,
  des_fin DOUBLE PRECISION,
  com_tot DOUBLE PRECISION,
  condicion TEXT,
  cve_obs INTEGER,
  num_alma INTEGER,
  act_cxc TEXT,
  act_coi TEXT,
  enlazado TEXT,
  tip_doc_e TEXT,
  num_moned INTEGER,
  tipcamb DOUBLE PRECISION,
  num_pagos INTEGER,
  fechaelab TIMESTAMPTZ,
  primerpago DOUBLE PRECISION,
  rfc TEXT,
  ctlpol INTEGER,
  escfd TEXT,
  autoriza INTEGER,
  serie TEXT,
  folio INTEGER,
  autoanio TEXT,
  dat_envio INTEGER,
  contado TEXT,
  dat_mostr INTEGER,
  cve_bita INTEGER,
  bloq TEXT,
  formaenvio TEXT,
  des_fin_porc DOUBLE PRECISION,
  des_tot_porc DOUBLE PRECISION,
  importe DOUBLE PRECISION,
  com_tot_porc DOUBLE PRECISION,
  metododepago TEXT,
  numctapago TEXT,
  tip_doc_ant TEXT,
  doc_ant TEXT,
  tip_doc_sig TEXT,
  doc_sig TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  formadepagosat TEXT,
  uso_cfdi TEXT,
  tip_traslado TEXT,
  num_alm_des INTEGER,
  reg_fisc TEXT,
  tip_fac TEXT,
  imp_tot8 DOUBLE PRECISION,
  imp_tot7 DOUBLE PRECISION,
  imp_tot6 DOUBLE PRECISION,
  imp_tot5 DOUBLE PRECISION,
  ctlcoi INTEGER
);

ALTER TABLE factd05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: factd_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS factd_clib05 CASCADE;

CREATE TABLE factd_clib05 (
  clave_doc TEXT
);

ALTER TABLE factd_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: facte05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS facte05 CASCADE;

CREATE TABLE facte05 (
  tip_doc TEXT,
  cve_doc TEXT,
  cve_clpv TEXT,
  status TEXT,
  dat_mostr INTEGER,
  cve_vend TEXT,
  cve_pedi TEXT,
  fecha_doc TIMESTAMPTZ,
  fecha_ent TIMESTAMPTZ,
  fecha_ven TIMESTAMPTZ,
  fecha_cancela TIMESTAMPTZ,
  can_tot DOUBLE PRECISION,
  imp_tot1 DOUBLE PRECISION,
  imp_tot2 DOUBLE PRECISION,
  imp_tot3 DOUBLE PRECISION,
  imp_tot4 DOUBLE PRECISION,
  des_tot DOUBLE PRECISION,
  des_fin DOUBLE PRECISION,
  com_tot DOUBLE PRECISION,
  condicion TEXT,
  cve_obs INTEGER,
  num_alma INTEGER,
  act_cxc TEXT,
  act_coi TEXT,
  enlazado TEXT,
  tip_doc_e TEXT,
  num_moned INTEGER,
  tipcamb DOUBLE PRECISION,
  num_pagos INTEGER,
  fechaelab TIMESTAMPTZ,
  primerpago DOUBLE PRECISION,
  rfc TEXT,
  ctlpol INTEGER,
  escfd TEXT,
  autoriza INTEGER,
  serie TEXT,
  folio INTEGER,
  autoanio TEXT,
  dat_envio INTEGER,
  contado TEXT,
  cve_bita INTEGER,
  bloq TEXT,
  formaenvio TEXT,
  des_fin_porc DOUBLE PRECISION,
  des_tot_porc DOUBLE PRECISION,
  importe DOUBLE PRECISION,
  com_tot_porc DOUBLE PRECISION,
  metododepago TEXT,
  numctapago TEXT,
  tip_doc_ant TEXT,
  doc_ant TEXT,
  tip_doc_sig TEXT,
  doc_sig TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  formadepagosat TEXT,
  uso_cfdi TEXT,
  tip_traslado TEXT,
  num_alm_des INTEGER,
  imp_tot6 DOUBLE PRECISION,
  reg_fisc TEXT,
  tip_fac TEXT,
  imp_tot8 DOUBLE PRECISION,
  imp_tot7 DOUBLE PRECISION,
  imp_tot5 DOUBLE PRECISION,
  ctlcoi INTEGER
);

ALTER TABLE facte05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: facte_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS facte_clib05 CASCADE;

CREATE TABLE facte_clib05 (
  clave_doc TEXT
);

ALTER TABLE facte_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: factf05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS factf05 CASCADE;

CREATE TABLE factf05 (
  tip_doc TEXT,
  cve_doc TEXT,
  cve_clpv TEXT,
  status TEXT,
  dat_mostr INTEGER,
  cve_vend TEXT,
  cve_pedi TEXT,
  fecha_doc TIMESTAMPTZ,
  fecha_ent TIMESTAMPTZ,
  fecha_ven TIMESTAMPTZ,
  fecha_cancela TIMESTAMPTZ,
  can_tot DOUBLE PRECISION,
  imp_tot1 DOUBLE PRECISION,
  imp_tot2 DOUBLE PRECISION,
  imp_tot3 DOUBLE PRECISION,
  imp_tot4 DOUBLE PRECISION,
  des_tot DOUBLE PRECISION,
  des_fin DOUBLE PRECISION,
  com_tot DOUBLE PRECISION,
  condicion TEXT,
  cve_obs INTEGER,
  num_alma INTEGER,
  act_cxc TEXT,
  act_coi TEXT,
  enlazado TEXT,
  tip_doc_e TEXT,
  num_moned INTEGER,
  tipcamb DOUBLE PRECISION,
  num_pagos INTEGER,
  fechaelab TIMESTAMPTZ,
  primerpago DOUBLE PRECISION,
  rfc TEXT,
  ctlpol INTEGER,
  escfd TEXT,
  autoriza INTEGER,
  serie TEXT,
  folio INTEGER,
  autoanio TEXT,
  dat_envio INTEGER,
  contado TEXT,
  cve_bita INTEGER,
  bloq TEXT,
  formaenvio TEXT,
  des_fin_porc DOUBLE PRECISION,
  des_tot_porc DOUBLE PRECISION,
  importe DOUBLE PRECISION,
  com_tot_porc DOUBLE PRECISION,
  metododepago TEXT,
  numctapago TEXT,
  tip_doc_ant TEXT,
  doc_ant TEXT,
  tip_doc_sig TEXT,
  doc_sig TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  formadepagosat TEXT,
  uso_cfdi TEXT,
  tip_traslado TEXT,
  num_alm_des INTEGER,
  reg_fisc TEXT,
  tip_fac TEXT,
  imp_tot8 DOUBLE PRECISION,
  imp_tot7 DOUBLE PRECISION,
  imp_tot6 DOUBLE PRECISION,
  imp_tot5 DOUBLE PRECISION,
  ctlcoi INTEGER
);

ALTER TABLE factf05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: factf_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS factf_clib05 CASCADE;

CREATE TABLE factf_clib05 (
  clave_doc TEXT
);

ALTER TABLE factf_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: factg05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS factg05 CASCADE;

CREATE TABLE factg05 (
  tip_doc TEXT,
  cve_doc TEXT,
  cve_clpv TEXT,
  status TEXT,
  dat_mostr INTEGER,
  cve_vend TEXT,
  cve_pedi TEXT,
  fecha_doc TIMESTAMPTZ,
  fecha_ent TIMESTAMPTZ,
  fecha_ven TIMESTAMPTZ,
  fecha_cancela TIMESTAMPTZ,
  can_tot DOUBLE PRECISION,
  imp_tot1 DOUBLE PRECISION,
  imp_tot2 DOUBLE PRECISION,
  imp_tot3 DOUBLE PRECISION,
  imp_tot4 DOUBLE PRECISION,
  des_tot DOUBLE PRECISION,
  des_fin DOUBLE PRECISION,
  com_tot DOUBLE PRECISION,
  condicion TEXT,
  cve_obs INTEGER,
  num_alma INTEGER,
  act_cxc TEXT,
  act_coi TEXT,
  enlazado TEXT,
  tip_doc_e TEXT,
  num_moned INTEGER,
  tipcamb DOUBLE PRECISION,
  num_pagos INTEGER,
  fechaelab TIMESTAMPTZ,
  primerpago DOUBLE PRECISION,
  rfc TEXT,
  ctlpol INTEGER,
  escfd TEXT,
  autoriza INTEGER,
  serie TEXT,
  folio INTEGER,
  autoanio TEXT,
  dat_envio INTEGER,
  contado TEXT,
  cve_bita INTEGER,
  bloq TEXT,
  formaenvio TEXT,
  des_fin_porc DOUBLE PRECISION,
  des_tot_porc DOUBLE PRECISION,
  importe DOUBLE PRECISION,
  com_tot_porc DOUBLE PRECISION,
  metododepago TEXT,
  numctapago TEXT,
  tip_doc_ant TEXT,
  doc_ant TEXT,
  tip_doc_sig TEXT,
  doc_sig TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  formadepagosat TEXT,
  uso_cfdi TEXT,
  tip_traslado TEXT,
  num_alm_des INTEGER,
  tip_fac TEXT,
  imp_tot8 DOUBLE PRECISION,
  imp_tot7 DOUBLE PRECISION,
  imp_tot6 DOUBLE PRECISION,
  imp_tot5 DOUBLE PRECISION,
  reg_fisc TEXT,
  ctlcoi INTEGER
);

ALTER TABLE factg05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: factg_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS factg_clib05 CASCADE;

CREATE TABLE factg_clib05 (
  clave_doc TEXT
);

ALTER TABLE factg_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: factp05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS factp05 CASCADE;

CREATE TABLE factp05 (
  tip_doc TEXT,
  cve_doc TEXT,
  cve_clpv TEXT,
  status TEXT,
  dat_mostr INTEGER,
  cve_vend TEXT,
  cve_pedi TEXT,
  fecha_doc TIMESTAMPTZ,
  fecha_ent TIMESTAMPTZ,
  fecha_ven TIMESTAMPTZ,
  fecha_cancela TIMESTAMPTZ,
  can_tot DOUBLE PRECISION,
  imp_tot1 DOUBLE PRECISION,
  imp_tot2 DOUBLE PRECISION,
  imp_tot3 DOUBLE PRECISION,
  imp_tot4 DOUBLE PRECISION,
  des_tot DOUBLE PRECISION,
  des_fin DOUBLE PRECISION,
  com_tot DOUBLE PRECISION,
  condicion TEXT,
  cve_obs INTEGER,
  num_alma INTEGER,
  act_cxc TEXT,
  act_coi TEXT,
  enlazado TEXT,
  tip_doc_e TEXT,
  num_moned INTEGER,
  tipcamb DOUBLE PRECISION,
  num_pagos INTEGER,
  fechaelab TIMESTAMPTZ,
  primerpago DOUBLE PRECISION,
  rfc TEXT,
  ctlpol INTEGER,
  escfd TEXT,
  autoriza INTEGER,
  serie TEXT,
  folio INTEGER,
  autoanio TEXT,
  dat_envio INTEGER,
  contado TEXT,
  cve_bita INTEGER,
  bloq TEXT,
  formaenvio TEXT,
  des_fin_porc DOUBLE PRECISION,
  des_tot_porc DOUBLE PRECISION,
  importe DOUBLE PRECISION,
  com_tot_porc DOUBLE PRECISION,
  metododepago TEXT,
  numctapago TEXT,
  tip_doc_ant TEXT,
  doc_ant TEXT,
  tip_doc_sig TEXT,
  doc_sig TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  formadepagosat TEXT,
  uso_cfdi TEXT,
  num_alm_des INTEGER,
  tip_traslado TEXT,
  imp_tot8 DOUBLE PRECISION,
  reg_fisc TEXT,
  tip_fac TEXT,
  imp_tot7 DOUBLE PRECISION,
  imp_tot6 DOUBLE PRECISION,
  imp_tot5 DOUBLE PRECISION,
  ctlcoi INTEGER
);

ALTER TABLE factp05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: factp_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS factp_clib05 CASCADE;

CREATE TABLE factp_clib05 (
  clave_doc TEXT
);

ALTER TABLE factp_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: factr05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS factr05 CASCADE;

CREATE TABLE factr05 (
  tip_doc TEXT,
  cve_doc TEXT,
  cve_clpv TEXT,
  status TEXT,
  dat_mostr INTEGER,
  cve_vend TEXT,
  cve_pedi TEXT,
  fecha_doc TIMESTAMPTZ,
  fecha_ent TIMESTAMPTZ,
  fecha_ven TIMESTAMPTZ,
  fecha_cancela TIMESTAMPTZ,
  can_tot DOUBLE PRECISION,
  imp_tot1 DOUBLE PRECISION,
  imp_tot2 DOUBLE PRECISION,
  imp_tot3 DOUBLE PRECISION,
  imp_tot4 DOUBLE PRECISION,
  des_tot DOUBLE PRECISION,
  des_fin DOUBLE PRECISION,
  com_tot DOUBLE PRECISION,
  condicion TEXT,
  cve_obs INTEGER,
  num_alma INTEGER,
  act_cxc TEXT,
  act_coi TEXT,
  enlazado TEXT,
  tip_doc_e TEXT,
  num_moned INTEGER,
  tipcamb DOUBLE PRECISION,
  num_pagos INTEGER,
  fechaelab TIMESTAMPTZ,
  primerpago DOUBLE PRECISION,
  rfc TEXT,
  ctlpol INTEGER,
  escfd TEXT,
  autoriza INTEGER,
  serie TEXT,
  folio INTEGER,
  autoanio TEXT,
  dat_envio INTEGER,
  contado TEXT,
  cve_bita INTEGER,
  bloq TEXT,
  formaenvio TEXT,
  des_fin_porc DOUBLE PRECISION,
  des_tot_porc DOUBLE PRECISION,
  importe DOUBLE PRECISION,
  com_tot_porc DOUBLE PRECISION,
  metododepago TEXT,
  numctapago TEXT,
  tip_doc_ant TEXT,
  doc_ant TEXT,
  tip_doc_sig TEXT,
  doc_sig TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  formadepagosat TEXT,
  uso_cfdi TEXT,
  tip_traslado TEXT,
  num_alm_des INTEGER,
  reg_fisc TEXT,
  tip_fac TEXT,
  imp_tot8 DOUBLE PRECISION,
  imp_tot7 DOUBLE PRECISION,
  imp_tot6 DOUBLE PRECISION,
  imp_tot5 DOUBLE PRECISION,
  ctlcoi INTEGER
);

ALTER TABLE factr05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: factr_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS factr_clib05 CASCADE;

CREATE TABLE factr_clib05 (
  clave_doc TEXT
);

ALTER TABLE factr_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: factt05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS factt05 CASCADE;

CREATE TABLE factt05 (
  tip_doc TEXT,
  cve_doc TEXT,
  cve_clpv TEXT,
  status TEXT,
  dat_mostr INTEGER,
  cve_vend TEXT,
  cve_pedi TEXT,
  fecha_doc TIMESTAMPTZ,
  fecha_ent TIMESTAMPTZ,
  fecha_ven TIMESTAMPTZ,
  fecha_cancela TIMESTAMPTZ,
  can_tot DOUBLE PRECISION,
  imp_tot1 DOUBLE PRECISION,
  imp_tot2 DOUBLE PRECISION,
  imp_tot3 DOUBLE PRECISION,
  imp_tot4 DOUBLE PRECISION,
  des_tot DOUBLE PRECISION,
  des_fin DOUBLE PRECISION,
  com_tot DOUBLE PRECISION,
  condicion TEXT,
  cve_obs INTEGER,
  num_alma INTEGER,
  act_cxc TEXT,
  act_coi TEXT,
  enlazado TEXT,
  tip_doc_e TEXT,
  num_moned INTEGER,
  tipcamb DOUBLE PRECISION,
  num_pagos INTEGER,
  fechaelab TIMESTAMPTZ,
  primerpago DOUBLE PRECISION,
  rfc TEXT,
  ctlpol INTEGER,
  escfd TEXT,
  autoriza INTEGER,
  serie TEXT,
  folio INTEGER,
  autoanio TEXT,
  dat_envio INTEGER,
  contado TEXT,
  cve_bita INTEGER,
  bloq TEXT,
  formaenvio TEXT,
  des_fin_porc DOUBLE PRECISION,
  des_tot_porc DOUBLE PRECISION,
  importe DOUBLE PRECISION,
  com_tot_porc DOUBLE PRECISION,
  metododepago TEXT,
  numctapago TEXT,
  tip_doc_ant TEXT,
  doc_ant TEXT,
  tip_doc_sig TEXT,
  doc_sig TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  formadepagosat TEXT,
  uso_cfdi TEXT,
  num_alm_des INTEGER,
  tip_traslado TEXT,
  imp_tot5 DOUBLE PRECISION,
  reg_fisc TEXT,
  tip_fac TEXT,
  imp_tot8 DOUBLE PRECISION,
  imp_tot7 DOUBLE PRECISION,
  imp_tot6 DOUBLE PRECISION,
  ctlcoi INTEGER
);

ALTER TABLE factt05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: factt_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS factt_clib05 CASCADE;

CREATE TABLE factt_clib05 (
  clave_doc TEXT
);

ALTER TABLE factt_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: factv05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS factv05 CASCADE;

CREATE TABLE factv05 (
  tip_doc TEXT,
  cve_doc TEXT,
  cve_clpv TEXT,
  status TEXT,
  dat_mostr INTEGER,
  cve_vend TEXT,
  cve_pedi TEXT,
  fecha_doc TIMESTAMPTZ,
  fecha_ent TIMESTAMPTZ,
  fecha_ven TIMESTAMPTZ,
  fecha_cancela TIMESTAMPTZ,
  can_tot DOUBLE PRECISION,
  imp_tot1 DOUBLE PRECISION,
  imp_tot2 DOUBLE PRECISION,
  imp_tot3 DOUBLE PRECISION,
  imp_tot4 DOUBLE PRECISION,
  des_tot DOUBLE PRECISION,
  des_fin DOUBLE PRECISION,
  com_tot DOUBLE PRECISION,
  condicion TEXT,
  cve_obs INTEGER,
  num_alma INTEGER,
  act_cxc TEXT,
  act_coi TEXT,
  enlazado TEXT,
  tip_doc_e TEXT,
  num_moned INTEGER,
  tipcamb DOUBLE PRECISION,
  num_pagos INTEGER,
  fechaelab TIMESTAMPTZ,
  primerpago DOUBLE PRECISION,
  rfc TEXT,
  ctlpol INTEGER,
  escfd TEXT,
  autoriza INTEGER,
  serie TEXT,
  folio INTEGER,
  autoanio TEXT,
  dat_envio INTEGER,
  contado TEXT,
  cve_bita INTEGER,
  bloq TEXT,
  formaenvio TEXT,
  des_fin_porc DOUBLE PRECISION,
  des_tot_porc DOUBLE PRECISION,
  importe DOUBLE PRECISION,
  com_tot_porc DOUBLE PRECISION,
  metododepago TEXT,
  numctapago TEXT,
  tip_doc_ant TEXT,
  doc_ant TEXT,
  tip_doc_sig TEXT,
  doc_sig TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  formadepagosat TEXT,
  uso_cfdi TEXT,
  tip_traslado TEXT,
  num_alm_des INTEGER,
  reg_fisc TEXT,
  tip_fac TEXT,
  imp_tot8 DOUBLE PRECISION,
  imp_tot7 DOUBLE PRECISION,
  imp_tot6 DOUBLE PRECISION,
  imp_tot5 DOUBLE PRECISION,
  ctlcoi INTEGER
);

ALTER TABLE factv05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: factv_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS factv_clib05 CASCADE;

CREATE TABLE factv_clib05 (
  clave_doc TEXT
);

ALTER TABLE factv_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: fact_global05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS fact_global05 CASCADE;

CREATE TABLE fact_global05 (
  clave_doc TEXT,
  periodicidad TEXT,
  meses TEXT,
  anio INTEGER
);

ALTER TABLE fact_global05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: folcxc05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS folcxc05 CASCADE;

CREATE TABLE folcxc05 (
  cve_folio TEXT,
  impuesto1 DOUBLE PRECISION,
  impuesto2 DOUBLE PRECISION,
  impuesto3 DOUBLE PRECISION,
  impuesto4 DOUBLE PRECISION,
  referencia TEXT,
  status TEXT,
  fecha TIMESTAMPTZ,
  fechaelab TIMESTAMPTZ,
  usuario INTEGER
);

ALTER TABLE folcxc05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: folcxp05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS folcxp05 CASCADE;

CREATE TABLE folcxp05 (
  cve_folio TEXT,
  impuesto1 DOUBLE PRECISION,
  impuesto2 DOUBLE PRECISION,
  impuesto3 DOUBLE PRECISION,
  impuesto4 DOUBLE PRECISION,
  referencia TEXT,
  status TEXT,
  fecha TIMESTAMPTZ,
  fechaelab TIMESTAMPTZ,
  usuario INTEGER
);

ALTER TABLE folcxp05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: foliosc05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS foliosc05 CASCADE;

CREATE TABLE foliosc05 (
  tip_doc TEXT,
  foliodesde INTEGER,
  foliohasta INTEGER,
  serie TEXT,
  ult_doc INTEGER,
  fech_ult_doc TIMESTAMPTZ,
  status TEXT
);

ALTER TABLE foliosc05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: folioscxc05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS folioscxc05 CASCADE;

CREATE TABLE folioscxc05 (
  cve_folio TEXT,
  ult_folio INTEGER
);

ALTER TABLE folioscxc05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: folioscxp05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS folioscxp05 CASCADE;

CREATE TABLE folioscxp05 (
  cve_folio TEXT,
  ult_folio INTEGER
);

ALTER TABLE folioscxp05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: foliosf05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS foliosf05 CASCADE;

CREATE TABLE foliosf05 (
  tip_doc TEXT,
  foliodesde INTEGER,
  foliohasta INTEGER,
  autoriza INTEGER,
  serie TEXT,
  autoanio TEXT,
  ult_doc INTEGER,
  tipo TEXT,
  fech_ult_doc TIMESTAMPTZ,
  cbb TEXT,
  fechaaprobcbb TIMESTAMPTZ,
  imgcbb TEXT,
  foliopersonalizado TEXT,
  parcialidad TEXT,
  status TEXT
);

ALTER TABLE foliosf05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: foto_inve05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS foto_inve05 CASCADE;

CREATE TABLE foto_inve05 (
  cve_art TEXT,
  foto TEXT
);

ALTER TABLE foto_inve05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: guicam05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS guicam05 CASCADE;

CREATE TABLE guicam05 (
  cve_campania TEXT,
  guia TEXT
);

ALTER TABLE guicam05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: hnumser05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS hnumser05 CASCADE;

CREATE TABLE hnumser05 (
  cve_art TEXT,
  num_ser TEXT,
  tip_mov INTEGER,
  tip_doc TEXT,
  cve_doc TEXT,
  almacen INTEGER,
  reg_serie INTEGER,
  fecha TIMESTAMPTZ,
  status TEXT,
  no_par INTEGER
);

ALTER TABLE hnumser05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: img_articulo05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS img_articulo05 CASCADE;

CREATE TABLE img_articulo05 (
  cve_art TEXT,
  num_img INTEGER,
  id_img TEXT,
  nom_img TEXT
);

ALTER TABLE img_articulo05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: impu05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS impu05 CASCADE;

CREATE TABLE impu05 (
  cve_esqimpu INTEGER,
  descripesq TEXT,
  impuesto1 DOUBLE PRECISION,
  imp1aplica INTEGER,
  impuesto2 DOUBLE PRECISION,
  imp2aplica INTEGER,
  impuesto3 DOUBLE PRECISION,
  imp3aplica INTEGER,
  impuesto4 DOUBLE PRECISION,
  imp4aplica INTEGER,
  status TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  impuesto6 DOUBLE PRECISION,
  imp8aplica INTEGER,
  impuesto8 DOUBLE PRECISION,
  imp7aplica INTEGER,
  impuesto7 DOUBLE PRECISION,
  imp6aplica INTEGER,
  imp5aplica INTEGER,
  impuesto5 DOUBLE PRECISION
);

ALTER TABLE impu05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: infcli05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS infcli05 CASCADE;

CREATE TABLE infcli05 (
  cve_info INTEGER,
  nombre TEXT,
  calle TEXT,
  numint TEXT,
  numext TEXT,
  cruzamientos TEXT,
  cruzamientos2 TEXT,
  colonia TEXT,
  pob TEXT,
  curp TEXT,
  cve_zona TEXT,
  cve_obs INTEGER,
  referdir TEXT,
  codigo TEXT,
  estado TEXT,
  pais TEXT,
  municipio TEXT,
  rfc TEXT,
  cve_pais_sat TEXT,
  reg_fisc TEXT
);

ALTER TABLE infcli05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: infenvio05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS infenvio05 CASCADE;

CREATE TABLE infenvio05 (
  cve_info INTEGER,
  cve_cons TEXT,
  nombre TEXT,
  calle TEXT,
  numint TEXT,
  numext TEXT,
  cruzamientos TEXT,
  cruzamientos2 TEXT,
  pob TEXT,
  curp TEXT,
  referdir TEXT,
  cve_zona TEXT,
  cve_obs INTEGER,
  strnoguia TEXT,
  strmodoenv TEXT,
  fecha_env TIMESTAMPTZ,
  nombre_recep TEXT,
  no_recep TEXT,
  fecha_recep TIMESTAMPTZ,
  colonia TEXT,
  codigo TEXT,
  estado TEXT,
  pais TEXT,
  municipio TEXT,
  guia_env TEXT,
  fac_env TEXT,
  id_guia TEXT,
  r_evidencia TEXT,
  r_factura TEXT,
  f_entrega TIMESTAMPTZ,
  cve_ped_tiend TEXT,
  paqueteria TEXT,
  reg_fisc TEXT,
  cve_pais_sat TEXT,
  feeddocument_guia TEXT
);

ALTER TABLE infenvio05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: intcoi05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS intcoi05 CASCADE;

CREATE TABLE intcoi05 (
  cve_intcoi INTEGER,
  transaccio INTEGER,
  tipopol TEXT,
  numpol TEXT,
  fechapol TIMESTAMPTZ,
  fechaopr TIMESTAMPTZ,
  sistema TEXT,
  numusr INTEGER,
  operacion INTEGER,
  status INTEGER,
  tippolint TEXT,
  polmodelo TEXT,
  ctlpol INTEGER,
  statuscli TEXT
);

ALTER TABLE intcoi05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: inve05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS inve05 CASCADE;

CREATE TABLE inve05 (
  cve_art TEXT,
  descr TEXT,
  lin_prod TEXT,
  con_serie TEXT,
  uni_med TEXT,
  uni_emp DOUBLE PRECISION,
  ctrl_alm TEXT,
  tiem_surt INTEGER,
  stock_min DOUBLE PRECISION,
  stock_max DOUBLE PRECISION,
  tip_costeo TEXT,
  num_mon INTEGER,
  fch_ultcom TIMESTAMPTZ,
  comp_x_rec DOUBLE PRECISION,
  fch_ultvta TIMESTAMPTZ,
  pend_surt DOUBLE PRECISION,
  exist DOUBLE PRECISION,
  costo_prom DOUBLE PRECISION,
  ult_costo DOUBLE PRECISION,
  cve_obs INTEGER,
  tipo_ele TEXT,
  uni_alt TEXT,
  fac_conv DOUBLE PRECISION,
  apart DOUBLE PRECISION,
  con_lote TEXT,
  con_pedimento TEXT,
  peso DOUBLE PRECISION,
  volumen DOUBLE PRECISION,
  cve_esqimpu INTEGER,
  cve_bita INTEGER,
  vtas_anl_c DOUBLE PRECISION,
  vtas_anl_m DOUBLE PRECISION,
  comp_anl_c DOUBLE PRECISION,
  comp_anl_m DOUBLE PRECISION,
  prefijo TEXT,
  talla TEXT,
  color TEXT,
  cuent_cont TEXT,
  cve_imagen TEXT,
  blk_cst_ext TEXT,
  status TEXT,
  man_ieps TEXT,
  apl_man_imp INTEGER,
  cuota_ieps DOUBLE PRECISION,
  apl_man_ieps TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  version_sinc_fecha_img TIMESTAMPTZ,
  cve_prodserv TEXT,
  cve_unidad TEXT,
  mat_peli TEXT,
  titulo_ml TEXT,
  id_catalogo TEXT,
  en_catalogo TEXT,
  imagen_ml TEXT,
  f_crea_ml TIMESTAMPTZ,
  last_update_ml TEXT,
  cve_cate_ml TEXT,
  disponible_publ TEXT,
  campos_categ_ml TEXT,
  categ_ml TEXT,
  envio_ml TEXT,
  largo_ml DOUBLE PRECISION,
  edo_publ_ml TEXT,
  condicion_ml TEXT,
  tipo_publ_ml TEXT,
  modo_envio_ml TEXT,
  cve_publ_ml TEXT,
  alto_ml DOUBLE PRECISION,
  ancho_ml DOUBLE PRECISION,
  desc_especifica TEXT,
  coi_sinc TIMESTAMPTZ,
  fac_unid_cce DOUBLE PRECISION,
  uni_aduana TEXT,
  fracc_aranc TEXT
);

ALTER TABLE inve05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: inven_claro05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS inven_claro05 CASCADE;

CREATE TABLE inven_claro05 (
  cve_art TEXT,
  cve_publ_cs TEXT,
  edo_publ_cs TEXT,
  edo_prod_cs TEXT,
  desc_cs TEXT,
  sku_cs TEXT,
  ean_cs TEXT,
  categ_cs TEXT,
  cve_cate_cs TEXT,
  marca_cs TEXT,
  tiemp_embarq INTEGER,
  largo_cs DOUBLE PRECISION,
  alto_cs DOUBLE PRECISION,
  ancho_cs DOUBLE PRECISION,
  last_update_cs TIMESTAMPTZ,
  imagen_cs TEXT,
  disp_publ_cs TEXT,
  f_crea_cs TIMESTAMPTZ,
  fulfillment TEXT,
  descr_esp TEXT
);

ALTER TABLE inven_claro05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: inve_amazon05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS inve_amazon05 CASCADE;

CREATE TABLE inve_amazon05 (
  cve_art TEXT,
  asin TEXT,
  sku_am TEXT,
  edo_publ_am TEXT,
  condicion TEXT,
  mod_envio TEXT,
  status TEXT,
  submit_id TEXT,
  titulopub_am TEXT,
  titulo_am TEXT,
  fabricante_am TEXT,
  marca_am TEXT,
  tipo_prod_am TEXT,
  descr_am TEXT,
  atributos_am TEXT,
  carac_am TEXT,
  disp_publ_am TEXT,
  f_pub_am TIMESTAMPTZ,
  disp_oferta TEXT,
  f_des_of TIMESTAMPTZ,
  f_has_of TIMESTAMPTZ,
  status_inv TEXT,
  submit_inv_id TEXT,
  status_pre TEXT,
  submit_pre_id TEXT,
  status_elim TEXT,
  submit_elim_id TEXT,
  feeddocument_elim TEXT,
  feeddocument_pre TEXT,
  feeddocument_inv TEXT,
  feeddocument TEXT
);

ALTER TABLE inve_amazon05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: inve_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS inve_clib05 CASCADE;

CREATE TABLE inve_clib05 (
  cve_prod TEXT,
  camplib1 TEXT,
  camplib2 TEXT,
  camplib3 TEXT,
  camplib4 INTEGER,
  camplib5 DOUBLE PRECISION,
  camplib6 DOUBLE PRECISION
);

ALTER TABLE inve_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: inve_meli05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS inve_meli05 CASCADE;

CREATE TABLE inve_meli05 (
  cve_art TEXT,
  descr_ml TEXT
);

ALTER TABLE inve_meli05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: invfis05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS invfis05 CASCADE;

CREATE TABLE invfis05 (
  cve_art TEXT,
  cve_alm INTEGER,
  existcong DOUBLE PRECISION,
  secapturo INTEGER,
  existreal DOUBLE PRECISION
);

ALTER TABLE invfis05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: kits05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS kits05 CASCADE;

CREATE TABLE kits05 (
  cve_art TEXT,
  cve_prod TEXT,
  porcen DOUBLE PRECISION,
  cantidad DOUBLE PRECISION
);

ALTER TABLE kits05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: listprodsust05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS listprodsust05 CASCADE;

CREATE TABLE listprodsust05 (
  cve_lista INTEGER,
  descripcion TEXT
);

ALTER TABLE listprodsust05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: lnkolkc05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS lnkolkc05 CASCADE;

CREATE TABLE lnkolkc05 (
  ncontacto INTEGER,
  usuariosae INTEGER,
  id_outlook TEXT,
  nombre_usuariosae TEXT
);

ALTER TABLE lnkolkc05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: lnkolkp05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS lnkolkp05 CASCADE;

CREATE TABLE lnkolkp05 (
  ncontacto INTEGER,
  id_outlook TEXT,
  usuariosae INTEGER,
  nombre_usuariosae TEXT
);

ALTER TABLE lnkolkp05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: ln_rfc05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS ln_rfc05 CASCADE;

CREATE TABLE ln_rfc05 (
  rfc TEXT,
  status TEXT,
  status_ant TEXT,
  estado TEXT,
  fecha_act TIMESTAMPTZ
);

ALTER TABLE ln_rfc05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: ltpd05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS ltpd05 CASCADE;

CREATE TABLE ltpd05 (
  cve_art TEXT,
  lote TEXT,
  pedimento TEXT,
  cve_alm INTEGER,
  fchcaduc TIMESTAMPTZ,
  fchaduana TIMESTAMPTZ,
  fchultmov TIMESTAMPTZ,
  nom_aduan TEXT,
  cantidad DOUBLE PRECISION,
  reg_ltpd INTEGER,
  cve_obs INTEGER,
  ciudad TEXT,
  frontera TEXT,
  fec_prod_lt TIMESTAMPTZ,
  gln TEXT,
  status TEXT,
  pedimentosat TEXT
);

ALTER TABLE ltpd05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: minve05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS minve05 CASCADE;

CREATE TABLE minve05 (
  cve_art TEXT,
  almacen INTEGER,
  num_mov INTEGER,
  cve_cpto INTEGER,
  fecha_docu TIMESTAMPTZ,
  tipo_doc TEXT,
  refer TEXT,
  clave_clpv TEXT,
  vend TEXT,
  cant DOUBLE PRECISION,
  cant_cost DOUBLE PRECISION,
  precio DOUBLE PRECISION,
  costo DOUBLE PRECISION,
  afec_coi TEXT,
  cve_obs INTEGER,
  reg_serie INTEGER,
  uni_venta TEXT,
  e_ltpd INTEGER,
  exist_g DOUBLE PRECISION,
  existencia DOUBLE PRECISION,
  tipo_prod TEXT,
  factor_con DOUBLE PRECISION,
  fechaelab TIMESTAMPTZ,
  ctlpol INTEGER,
  cve_folio TEXT,
  signo INTEGER,
  costeado TEXT,
  costo_prom_ini DOUBLE PRECISION,
  costo_prom_fin DOUBLE PRECISION,
  costo_prom_gral DOUBLE PRECISION,
  desde_inve TEXT,
  mov_enlazado INTEGER,
  ctlcoi INTEGER
);

ALTER TABLE minve05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: moned05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS moned05 CASCADE;

CREATE TABLE moned05 (
  num_moned INTEGER,
  descr TEXT,
  simbolo TEXT,
  tcambio DOUBLE PRECISION,
  fultcamb TIMESTAMPTZ,
  status TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  cve_moned TEXT
);

ALTER TABLE moned05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: mult05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS mult05 CASCADE;

CREATE TABLE mult05 (
  cve_art TEXT,
  cve_alm INTEGER,
  status TEXT,
  ctrl_alm TEXT,
  exist DOUBLE PRECISION,
  stock_min DOUBLE PRECISION,
  stock_max DOUBLE PRECISION,
  comp_x_rec DOUBLE PRECISION,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  pend_surt DOUBLE PRECISION
);

ALTER TABLE mult05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: numser05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS numser05 CASCADE;

CREATE TABLE numser05 (
  cve_art TEXT,
  num_ser TEXT,
  status TEXT,
  almacen INTEGER,
  costo DOUBLE PRECISION,
  docto_ent TEXT,
  fecha_ent TIMESTAMPTZ
);

ALTER TABLE numser05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: obs_docc05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS obs_docc05 CASCADE;

CREATE TABLE obs_docc05 (
  cve_obs INTEGER,
  str_obs TEXT
);

ALTER TABLE obs_docc05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: obs_docf05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS obs_docf05 CASCADE;

CREATE TABLE obs_docf05 (
  cve_obs INTEGER,
  str_obs TEXT
);

ALTER TABLE obs_docf05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: ocli05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS ocli05 CASCADE;

CREATE TABLE ocli05 (
  cve_obs INTEGER,
  str_obs TEXT
);

ALTER TABLE ocli05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: ocuen05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS ocuen05 CASCADE;

CREATE TABLE ocuen05 (
  cve_obs INTEGER,
  str_obs TEXT
);

ALTER TABLE ocuen05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: oinve05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS oinve05 CASCADE;

CREATE TABLE oinve05 (
  cve_obs INTEGER,
  str_obs TEXT
);

ALTER TABLE oinve05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: oltpd05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS oltpd05 CASCADE;

CREATE TABLE oltpd05 (
  cve_obs INTEGER,
  str_obs TEXT
);

ALTER TABLE oltpd05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: ominve05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS ominve05 CASCADE;

CREATE TABLE ominve05 (
  str_obs TEXT,
  cve_obs INTEGER
);

ALTER TABLE ominve05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: opaga05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS opaga05 CASCADE;

CREATE TABLE opaga05 (
  cve_obs INTEGER,
  str_obs TEXT
);

ALTER TABLE opaga05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: operador05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS operador05 CASCADE;

CREATE TABLE operador05 (
  cve_ope TEXT,
  nom_ope TEXT,
  xml_ope TEXT,
  tipo_fig TEXT
);

ALTER TABLE operador05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: oper_terceros05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS oper_terceros05 CASCADE;

CREATE TABLE oper_terceros05 (
  tipo INTEGER,
  descr TEXT
);

ALTER TABLE oper_terceros05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: oper_x_tipo_tercero05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS oper_x_tipo_tercero05 CASCADE;

CREATE TABLE oper_x_tipo_tercero05 (
  tip_tercero INTEGER,
  operacion INTEGER
);

ALTER TABLE oper_x_tipo_tercero05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: oprov05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS oprov05 CASCADE;

CREATE TABLE oprov05 (
  cve_obs INTEGER,
  str_obs TEXT
);

ALTER TABLE oprov05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: paga_det05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS paga_det05 CASCADE;

CREATE TABLE paga_det05 (
  cve_prov TEXT,
  refer TEXT,
  num_cpto INTEGER,
  num_cargo INTEGER,
  id_mov INTEGER,
  cve_folio TEXT,
  cve_obs INTEGER,
  no_factura TEXT,
  docto TEXT,
  importe DOUBLE PRECISION,
  fecha_apli TIMESTAMPTZ,
  fecha_venc TIMESTAMPTZ,
  afec_coi TEXT,
  num_moned INTEGER,
  tcambio DOUBLE PRECISION,
  impmon_ext DOUBLE PRECISION,
  fechaelab TIMESTAMPTZ,
  ctlpol INTEGER,
  cve_bita INTEGER,
  tipo_mov TEXT,
  signo INTEGER,
  cve_aut INTEGER,
  usuario INTEGER,
  ref_sist TEXT,
  no_partida INTEGER,
  refbanco_origen TEXT,
  refbanco_dest TEXT,
  numctapago_origen TEXT,
  numctapago_destino TEXT,
  numcheque TEXT,
  beneficiario TEXT,
  cve_externa TEXT,
  cve_doc_comppago TEXT,
  cta_banca_ordenante TEXT,
  ctlcoi INTEGER,
  cta_banca_prov TEXT
);

ALTER TABLE paga_det05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: paga_m05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS paga_m05 CASCADE;

CREATE TABLE paga_m05 (
  cve_prov TEXT,
  refer TEXT,
  num_cargo INTEGER,
  num_cpto INTEGER,
  cve_folio TEXT,
  cve_obs INTEGER,
  no_factura TEXT,
  docto TEXT,
  importe DOUBLE PRECISION,
  fecha_apli TIMESTAMPTZ,
  fecha_venc TIMESTAMPTZ,
  afec_coi TEXT,
  num_moned INTEGER,
  tcambio DOUBLE PRECISION,
  impmon_ext DOUBLE PRECISION,
  fechaelab TIMESTAMPTZ,
  ctlpol INTEGER,
  tipo_mov TEXT,
  cve_bita INTEGER,
  signo INTEGER,
  cve_aut INTEGER,
  usuario INTEGER,
  entregada TEXT,
  fecha_entrega TIMESTAMPTZ,
  ref_sist TEXT,
  status TEXT,
  ctlcoi INTEGER,
  modulo TEXT
);

ALTER TABLE paga_m05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: pagocodi05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS pagocodi05 CASCADE;

CREATE TABLE pagocodi05 (
  idmensaje TEXT,
  numcli TEXT,
  cve_clie TEXT,
  refer TEXT,
  id_mov INTEGER,
  num_cpto INTEGER,
  num_cargo INTEGER,
  estado INTEGER,
  metodo TEXT,
  monto DOUBLE PRECISION,
  folio TEXT,
  usado TEXT,
  fecha TIMESTAMPTZ,
  fecha_modificacion TIMESTAMPTZ
);

ALTER TABLE pagocodi05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: pagolinea05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS pagolinea05 CASCADE;

CREATE TABLE pagolinea05 (
  id_operacion TEXT,
  id_clientran INTEGER,
  autoriza INTEGER,
  tarjeta TEXT,
  tip_doc TEXT,
  fecha_oper TIMESTAMPTZ,
  estatus TEXT,
  tip_oper TEXT,
  aplicado TEXT,
  refer TEXT,
  monto DOUBLE PRECISION,
  num_cpto INTEGER,
  proveedor TEXT,
  xml_pl TEXT
);

ALTER TABLE pagolinea05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: pagos_ped_tienda05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS pagos_ped_tienda05 CASCADE;

CREATE TABLE pagos_ped_tienda05 (
  cve_doc TEXT,
  cve_pago TEXT,
  num_par INTEGER,
  edo_pago TEXT,
  det_edo TEXT,
  f_creacion TIMESTAMPTZ,
  f_aprob TIMESTAMPTZ,
  tipo_pago TEXT,
  moneda TEXT,
  importe DOUBLE PRECISION
);

ALTER TABLE pagos_ped_tienda05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: pais05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS pais05 CASCADE;

CREATE TABLE pais05 (
  cve_pais TEXT,
  descr TEXT
);

ALTER TABLE pais05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_aplicasoc05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_aplicasoc05 CASCADE;

CREATE TABLE param_aplicasoc05 (
  num_emp INTEGER,
  execalculadora TEXT,
  exeeditortextos TEXT,
  exehojacalculo TEXT,
  activarsugerencia TEXT,
  activarmodoaltcaptura TEXT,
  impresora TEXT
);

ALTER TABLE param_aplicasoc05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_camposlibres05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_camposlibres05 CASCADE;

CREATE TABLE param_camposlibres05 (
  num_emp INTEGER,
  idtabla TEXT,
  campo TEXT,
  etiqueta TEXT
);

ALTER TABLE param_camposlibres05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_clientes05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_clientes05 CASCADE;

CREATE TABLE param_clientes05 (
  num_emp INTEGER,
  diascredito INTEGER,
  clavesecuencial TEXT,
  cxcopintegrado TEXT,
  tipoagrupadoctos INTEGER,
  gananciacambiaria INTEGER,
  perdidacambiaria INTEGER,
  manejofolio TEXT,
  folio TEXT,
  fechalimdemov TIMESTAMPTZ,
  vercitasinicio TEXT,
  ajustecargo INTEGER,
  ajusteabono INTEGER
);

ALTER TABLE param_clientes05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_codi05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_codi05 CASCADE;

CREATE TABLE param_codi05 (
  num_emp INTEGER,
  alias_cert TEXT,
  config_codi TEXT,
  dig_verif TEXT,
  cert_codi TEXT,
  cuenta_benef TEXT,
  cve_banco TEXT,
  keysource TEXT,
  cve_acceso_cert TEXT,
  private_key TEXT,
  sellocert_arch TEXT,
  selloprivkey_arch TEXT,
  contrasenia TEXT,
  keyoriginal TEXT,
  codi_nombrevend TEXT
);

ALTER TABLE param_codi05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_compras05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_compras05 CASCADE;

CREATE TABLE param_compras05 (
  num_emp INTEGER,
  acumcompvtasenlinea TEXT,
  altaclieprovencaptura TEXT,
  altaprodencaptura TEXT,
  numcptocompvtasplazos INTEGER,
  numcptointxcompvtaplazo INTEGER,
  numcptoretclieprov INTEGER,
  numimpuesto INTEGER,
  manejoflete TEXT,
  montoflete DOUBLE PRECISION,
  impflete DOUBLE PRECISION,
  fchcierredoctos TIMESTAMPTZ,
  acumularindcxp INTEGER,
  modulo TEXT,
  modificaralmacen TEXT,
  registropagoscomp TEXT,
  polizasenlineacomp TEXT,
  polizasenlineacompdevol TEXT,
  polizaagrupcomp INTEGER,
  polizaagrupcompdevol INTEGER,
  restring_doc_efo INTEGER
);

ALTER TABLE param_compras05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_ctacontable05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_ctacontable05 CASCADE;

CREATE TABLE param_ctacontable05 (
  num_emp INTEGER,
  ventas TEXT,
  descfinanvtas TEXT,
  impxpagar TEXT,
  devolventas TEXT,
  ventaservicios TEXT,
  clientes TEXT,
  almacen TEXT,
  descfinancomp TEXT,
  impxacreditar TEXT,
  devolcompras TEXT,
  compraservicios TEXT,
  proveedores TEXT,
  bancos TEXT,
  otrosimpuestos TEXT,
  impuestoventa1 TEXT,
  impuestoventa2 TEXT,
  impuestoventa3 TEXT,
  difcostocompra TEXT,
  notascred TEXT
);

ALTER TABLE param_ctacontable05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_datosbancarios05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_datosbancarios05 CASCADE;

CREATE TABLE param_datosbancarios05 (
  num_emp INTEGER,
  banco TEXT,
  rfc TEXT,
  cuenta TEXT
);

ALTER TABLE param_datosbancarios05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_datosbd05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_datosbd05 CASCADE;

CREATE TABLE param_datosbd05 (
  num_emp INTEGER,
  rutadatos TEXT,
  driver TEXT,
  usuario TEXT,
  rutatrabajo TEXT,
  versionbd TEXT
);

ALTER TABLE param_datosbd05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_datosemp05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_datosemp05 CASCADE;

CREATE TABLE param_datosemp05 (
  num_emp INTEGER,
  nombre_empresa TEXT,
  direccion TEXT,
  poblacion TEXT,
  rfc TEXT,
  reg_estatal TEXT,
  logo_empresa TEXT,
  asignavalpredcveprodsat TEXT,
  valpredcveproductosat TEXT,
  asignavalpredunimedsat TEXT,
  valpredunimedprodsat TEXT,
  clie_factglobal TEXT
);

ALTER TABLE param_datosemp05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_datosgrales05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_datosgrales05 CASCADE;

CREATE TABLE param_datosgrales05 (
  num_emp INTEGER,
  redon_montos TEXT,
  redon_costos TEXT,
  charcompdos TEXT,
  pol_desc TEXT,
  cxccliemostr TEXT,
  multimoneda TEXT,
  valenlinea TEXT,
  solicitatipocambio TEXT,
  mostrarimagconsulta TEXT,
  esqimpuesto INTEGER,
  desccomercial DOUBLE PRECISION,
  cajoninstalado TEXT,
  puertocajon TEXT,
  secapertura TEXT,
  secinicio TEXT,
  secconfirma TEXT,
  monedapred INTEGER,
  impglobal DOUBLE PRECISION,
  tipocambio DOUBLE PRECISION,
  numempcoi INTEGER,
  conintoutlook TEXT,
  numdec_enmontos INTEGER,
  pagoporinternet TEXT,
  regsxdemanda TEXT,
  tampaquete INTEGER,
  bitacora_clientes TEXT,
  bitacora_facturas TEXT,
  bitacora_inventario TEXT,
  bitacora_proveedor TEXT,
  bitacora_compras TEXT,
  noservpagoxinter TEXT,
  bitacora_utilerias TEXT,
  bitacora_estadisticas TEXT,
  bitacora_configsistema TEXT,
  rutareportes TEXT,
  numdec_encostoyprecio INTEGER,
  numdec_porcentajes INTEGER,
  correoservidor TEXT,
  correopuerto INTEGER,
  correousuario TEXT,
  correocontrasenia TEXT,
  correoconseg TEXT,
  correoauten TEXT,
  correoproveedor INTEGER,
  desgloseimp1 TEXT,
  desgloseimp2 TEXT,
  desgloseimp3 TEXT,
  desgloseimp4 TEXT,
  refbanco TEXT,
  numctapago TEXT,
  versionreestructurada INTEGER,
  lat_general DOUBLE PRECISION,
  lon_general DOUBLE PRECISION,
  lat_envio DOUBLE PRECISION,
  lon_envio DOUBLE PRECISION,
  tiempoaire TEXT,
  bitacora_tiendas TEXT,
  numimpgeneral INTEGER,
  desgloseimp8 TEXT,
  desgloseimp7 TEXT,
  desgloseimp6 TEXT,
  desgloseimp5 TEXT,
  correoremitente TEXT,
  sucursales TEXT
);

ALTER TABLE param_datosgrales05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_domexped05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_domexped05 CASCADE;

CREATE TABLE param_domexped05 (
  num_emp INTEGER,
  calle TEXT,
  numero_ext TEXT,
  numero_int TEXT,
  colonia TEXT,
  localidad TEXT,
  referencia TEXT,
  municipio TEXT,
  estado TEXT,
  pais TEXT,
  cp TEXT,
  cruzamiento1 TEXT,
  cruzamiento2 TEXT,
  lugardeexped TEXT,
  zonahorariacp INTEGER,
  zonahorariabase INTEGER
);

ALTER TABLE param_domexped05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_domfiscal05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_domfiscal05 CASCADE;

CREATE TABLE param_domfiscal05 (
  num_emp INTEGER,
  calle TEXT,
  numero_ext TEXT,
  numero_int TEXT,
  colonia TEXT,
  localidad TEXT,
  referencia TEXT,
  municipio TEXT,
  estado TEXT,
  pais TEXT,
  cp TEXT,
  cruzamiento1 TEXT,
  cruzamiento2 TEXT,
  lugardeexped TEXT
);

ALTER TABLE param_domfiscal05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_factura05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_factura05 CASCADE;

CREATE TABLE param_factura05 (
  num_emp INTEGER,
  facturasinexist TEXT,
  altaclieprovencaptura TEXT,
  acumcompvtasenlinea TEXT,
  muestradesgkits TEXT,
  vendcvesec TEXT,
  noafecdoctoxclie TEXT,
  altanumserieenventas TEXT,
  facturarlotpedsinexist TEXT,
  permitirvtaprodcaducos TEXT,
  polizasenlineavtas TEXT,
  polizasenlineadevol TEXT,
  numdescuentos INTEGER,
  numimpuesto INTEGER,
  numcptocompvtasplazos INTEGER,
  numcptointxcompvtaplazo INTEGER,
  numcptoretclieprov INTEGER,
  nummaxpart INTEGER,
  manejoflete TEXT,
  montoflete DOUBLE PRECISION,
  impflete DOUBLE PRECISION,
  fchcierredoctos TIMESTAMPTZ,
  modulo TEXT,
  almacendevolucion INTEGER,
  conalmacendevolucion TEXT,
  almadevper INTEGER,
  modificaralmacen TEXT,
  reformafiscal2012 INTEGER,
  numcptonotavta INTEGER,
  numcptoefectivo INTEGER,
  numcptocambio INTEGER,
  captprimeroprod TEXT,
  almacenfactglob INTEGER,
  polizasenlineanotacred TEXT
);

ALTER TABLE param_factura05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_facturaelectronica05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_facturaelectronica05 CASCADE;

CREATE TABLE param_facturaelectronica05 (
  num_emp INTEGER,
  sellocertif TEXT,
  selloprivkey TEXT,
  cveaccesocert TEXT,
  avisasello INTEGER,
  rfcmostr TEXT,
  rutaaddendaf TEXT,
  rutaaddendad TEXT,
  rutanamespace TEXT,
  desgdesc TEXT,
  versioncomprobantedigital INTEGER,
  tipopacgeneral TEXT,
  usuariopac TEXT,
  passwordpac TEXT,
  proveedorpac TEXT,
  firmacontrato TEXT,
  idsesionpacgral TEXT,
  usuariopac_cancel TEXT,
  passwordpac_cancel TEXT,
  proveedorpac_cancel TEXT,
  notificacancelacionenauto TEXT,
  regimenfiscal TEXT,
  regimenfiscalsat TEXT,
  desplieguekitxml INTEGER,
  sellocertif_arch TEXT,
  selloprivkey_arch TEXT,
  mtomaxfact DOUBLE PRECISION,
  cancelaenformamanual TEXT,
  rutaaddendag TEXT,
  rutaaddendae TEXT,
  rutaaddendat TEXT,
  fielprivkey_arch TEXT,
  fielcertif_arch TEXT,
  avisasellofiel INTEGER,
  cveaccesofiel TEXT,
  fielprivkey TEXT,
  fielcertif TEXT,
  envioauttablero TEXT
);

ALTER TABLE param_facturaelectronica05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_foliosc05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_foliosc05 CASCADE;

CREATE TABLE param_foliosc05 (
  num_emp INTEGER,
  numfolio TEXT,
  cvefolio TEXT,
  tipodocto TEXT,
  tipo TEXT,
  serie TEXT,
  folioinicial INTEGER,
  separador TEXT,
  ftoemision TEXT,
  archconfig TEXT,
  mascara TEXT,
  longitud INTEGER
);

ALTER TABLE param_foliosc05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_foliosf05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_foliosf05 CASCADE;

CREATE TABLE param_foliosf05 (
  num_emp INTEGER,
  numfolio TEXT,
  cvefolio TEXT,
  tipodocto TEXT,
  tipo TEXT,
  serie TEXT,
  separador TEXT,
  ftoemision TEXT,
  mascara TEXT,
  folioinicial INTEGER,
  foliofinal INTEGER,
  archconfig TEXT,
  longitud INTEGER,
  calle TEXT,
  numeroext TEXT,
  numeroint TEXT,
  colonia TEXT,
  localidad TEXT,
  referencia TEXT,
  municipio TEXT,
  estado TEXT,
  pais TEXT,
  cp TEXT,
  cruzamiento1 TEXT,
  cruzamiento2 TEXT,
  sellocertif TEXT,
  selloprivkey TEXT,
  cveaccesocert TEXT,
  avisasello INTEGER,
  usuariopac TEXT,
  passwordpac TEXT,
  proveedorpac TEXT,
  firmacontrato TEXT,
  idsesionpac TEXT,
  regimenfiscal TEXT,
  regimenfiscalsat TEXT,
  lugardeexpedicion TEXT,
  parcialidad TEXT,
  plantilla TEXT,
  foliopersonalizado TEXT,
  status TEXT,
  sellocertif_arch TEXT,
  selloprivkey_arch TEXT,
  ftoemisioncfdi33 TEXT,
  ubi_emi TEXT,
  cap_com_ext TEXT,
  ftoemisioncfdi40 TEXT,
  zonahorariacp INTEGER,
  zonahorariabase INTEGER,
  emi_ccx TEXT
);

ALTER TABLE param_foliosf05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_graficas05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_graficas05 CASCADE;

CREATE TABLE param_graficas05 (
  num_emp INTEGER,
  ajustvalmax TEXT,
  graficacum TEXT,
  nummaxval INTEGER,
  numsaltos INTEGER,
  copiarascii TEXT,
  copiarlotus TEXT,
  copiarexcel TEXT,
  copiarconencab TEXT,
  copiarcontotales TEXT
);

ALTER TABLE param_graficas05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_inter_coi05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_inter_coi05 CASCADE;

CREATE TABLE param_inter_coi05 (
  user_id_coi TEXT,
  num_emp_sae INTEGER,
  num_emp_coi INTEGER,
  num_serie_coi TEXT,
  rfc_coi TEXT,
  nom_emp_coi TEXT,
  estatus TEXT,
  prox_sincro TEXT,
  tiempo_hora INTEGER,
  hora_x_dia TEXT
);

ALTER TABLE param_inter_coi05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_inventario05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_inventario05 CASCADE;

CREATE TABLE param_inventario05 (
  num_emp INTEGER,
  integrafacturas TEXT,
  integracompras TEXT,
  cambioexistencias TEXT,
  digitoverifica TEXT,
  multialmacen TEXT,
  cveprecminimo INTEGER,
  movtraspasoentrada INTEGER,
  movtraspasosalida INTEGER,
  numdecimales INTEGER,
  gpoprodleyendasecc1 TEXT,
  gpoprodleyendasecc2 TEXT,
  ftomovsinventario TEXT,
  verenaltanumserie TEXT,
  verenaltaloteyped TEXT,
  nombreimp1 TEXT,
  nombreimp2 TEXT,
  nombreimp3 TEXT,
  nombreimp4 TEXT,
  porcentajeimp1 DOUBLE PRECISION,
  porcentajeimp2 DOUBLE PRECISION,
  porcentajeimp3 DOUBLE PRECISION,
  porcentajeimp4 DOUBLE PRECISION,
  almacenpredeter INTEGER,
  invintegrado TEXT,
  modalmacen TEXT,
  fchcierredoctos TIMESTAMPTZ,
  servicioflete TEXT,
  costearxalmacen TEXT,
  prodfactglob TEXT,
  nombreimp1sat TEXT,
  nombreimp2sat TEXT,
  nombreimp3sat TEXT,
  nombreimp4sat TEXT,
  porcentajeresico DOUBLE PRECISION,
  nombreimp5 TEXT,
  nombreimp8sat TEXT,
  tipoimp1 TEXT,
  nivelimp8 TEXT,
  nivelimp7 TEXT,
  nivelimp6 TEXT,
  nivelimp5 TEXT,
  nivelimp4 TEXT,
  nivelimp3 TEXT,
  nivelimp2 TEXT,
  nivelimp1 TEXT,
  tipoimp2 TEXT,
  nombreimp7sat TEXT,
  nombreimp6sat TEXT,
  nombreimp5sat TEXT,
  porcentajeimp8 DOUBLE PRECISION,
  porcentajeimp7 DOUBLE PRECISION,
  porcentajeimp6 DOUBLE PRECISION,
  porcentajeimp5 DOUBLE PRECISION,
  nombreimp8 TEXT,
  nombreimp7 TEXT,
  nombreimp6 TEXT,
  tipoimp3 TEXT,
  tipoimp8 TEXT,
  tipoimp7 TEXT,
  tipoimp6 TEXT,
  tipoimp5 TEXT,
  tipoimp4 TEXT
);

ALTER TABLE param_inventario05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_partidascomp05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_partidascomp05 CASCADE;

CREATE TABLE param_partidascomp05 (
  num_emp INTEGER,
  capenaltadoctoobs TEXT,
  capenaltadoctoimp TEXT,
  capalmacenxpartidas TEXT,
  verencstanumserie TEXT,
  verencstaloteped TEXT,
  verencstaobs TEXT,
  verencstadsglsgpoprod TEXT,
  verencapnumserie TEXT,
  verencaploteped TEXT,
  verencapobs TEXT,
  consideraimp1encosto TEXT,
  indporpartida TEXT
);

ALTER TABLE param_partidascomp05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_partidasfact05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_partidasfact05 CASCADE;

CREATE TABLE param_partidasfact05 (
  num_emp INTEGER,
  capenaltadoctodescto TEXT,
  capenaltadoctoimp TEXT,
  capenaltadoctocomision TEXT,
  capalmacenxpartidas TEXT,
  capenaltadoctoobs TEXT,
  verencstatipoprod TEXT,
  verencstanumserie TEXT,
  verencstaloteped TEXT,
  verencstaobs TEXT,
  verencstaapartados TEXT,
  verencstadsglsgpoprod TEXT,
  verencaptipoprod TEXT,
  verencapnumserie TEXT,
  verencaploteped TEXT,
  verencapobs TEXT,
  verencapapartados TEXT,
  verencapdescrprod TEXT,
  verencapcostoprod TEXT,
  verencapclvesat TEXT,
  verencappreccimp TEXT
);

ALTER TABLE param_partidasfact05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_proveedores05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_proveedores05 CASCADE;

CREATE TABLE param_proveedores05 (
  num_emp INTEGER,
  clavesecuencial TEXT,
  cxcopintegrado TEXT,
  tipoagrupadoctos INTEGER,
  gananciacambiaria INTEGER,
  perdidacambiaria INTEGER,
  manejofolio TEXT,
  folio TEXT,
  fechalimdemov TIMESTAMPTZ,
  ajustecargo INTEGER,
  ajusteabono INTEGER
);

ALTER TABLE param_proveedores05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_tiendas05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_tiendas05 CASCADE;

CREATE TABLE param_tiendas05 (
  id_usuario INTEGER,
  num_emp INTEGER,
  cve_tienda TEXT,
  id_user_tiend TEXT,
  iniciar_auto TEXT,
  expiracion_token TIMESTAMPTZ,
  refresh_token TEXT,
  acces_token TEXT,
  cve_pv_cs TEXT,
  param_default TEXT,
  cve_alm INTEGER,
  lista_prec INTEGER,
  lista_prec_ofer INTEGER,
  serie TEXT,
  modo_exist TEXT,
  cve_clie TEXT
);

ALTER TABLE param_tiendas05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_tipodoctosc05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_tipodoctosc05 CASCADE;

CREATE TABLE param_tipodoctosc05 (
  num_emp INTEGER,
  modulo TEXT,
  tipodocto TEXT,
  foliosecuencial TEXT,
  archconfignosec TEXT,
  ftoemisionnosec TEXT,
  archplantillacorreo TEXT,
  manejarvigenciacotiz TEXT,
  diasvigenciacotiz INTEGER,
  idxftofolioconfig INTEGER,
  seriedefault TEXT
);

ALTER TABLE param_tipodoctosc05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_tipodoctosf05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_tipodoctosf05 CASCADE;

CREATE TABLE param_tipodoctosf05 (
  num_emp INTEGER,
  modulo TEXT,
  tipodocto TEXT,
  foliosecuencial TEXT,
  archconfignosec TEXT,
  ftoemisionnosec TEXT,
  archplantillacorreo TEXT,
  manejarvigenciacotiz TEXT,
  diasvigenciacotiz INTEGER,
  idxftofolioconfig INTEGER,
  seriedefault TEXT
);

ALTER TABLE param_tipodoctosf05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_compc05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_compc05 CASCADE;

CREATE TABLE par_compc05 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  cant DOUBLE PRECISION,
  pxr DOUBLE PRECISION,
  prec DOUBLE PRECISION,
  cost DOUBLE PRECISION,
  impu1 DOUBLE PRECISION,
  impu2 DOUBLE PRECISION,
  impu3 DOUBLE PRECISION,
  impu4 DOUBLE PRECISION,
  imp1apla INTEGER,
  imp2apla INTEGER,
  imp3apla INTEGER,
  imp4apla INTEGER,
  totimp1 DOUBLE PRECISION,
  totimp2 DOUBLE PRECISION,
  totimp3 DOUBLE PRECISION,
  totimp4 DOUBLE PRECISION,
  descu DOUBLE PRECISION,
  act_inv TEXT,
  tip_cam DOUBLE PRECISION,
  uni_venta TEXT,
  tipo_elem TEXT,
  tipo_prod TEXT,
  cve_obs INTEGER,
  reg_serie INTEGER,
  e_ltpd INTEGER,
  factconv DOUBLE PRECISION,
  cost_dev DOUBLE PRECISION,
  num_alm INTEGER,
  mindirecto DOUBLE PRECISION,
  num_mov INTEGER,
  tot_partida DOUBLE PRECISION,
  man_ieps TEXT,
  apl_man_imp INTEGER,
  cuota_ieps DOUBLE PRECISION,
  apl_man_ieps TEXT,
  mto_porc DOUBLE PRECISION,
  mto_cuota DOUBLE PRECISION,
  cve_esq INTEGER,
  descr_art TEXT,
  totimp5 DOUBLE PRECISION,
  imp8apla INTEGER,
  imp7apla INTEGER,
  imp6apla INTEGER,
  imp5apla INTEGER,
  impu8 DOUBLE PRECISION,
  impu7 DOUBLE PRECISION,
  impu6 DOUBLE PRECISION,
  impu5 DOUBLE PRECISION,
  totimp6 DOUBLE PRECISION,
  totimp7 DOUBLE PRECISION,
  totimp8 DOUBLE PRECISION,
  preccimp DOUBLE PRECISION
);

ALTER TABLE par_compc05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_compc_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_compc_clib05 CASCADE;

CREATE TABLE par_compc_clib05 (
  clave_doc TEXT,
  num_part INTEGER
);

ALTER TABLE par_compc_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_compd05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_compd05 CASCADE;

CREATE TABLE par_compd05 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  cant DOUBLE PRECISION,
  pxr DOUBLE PRECISION,
  prec DOUBLE PRECISION,
  cost DOUBLE PRECISION,
  impu1 DOUBLE PRECISION,
  impu2 DOUBLE PRECISION,
  impu3 DOUBLE PRECISION,
  impu4 DOUBLE PRECISION,
  imp1apla INTEGER,
  imp2apla INTEGER,
  imp3apla INTEGER,
  imp4apla INTEGER,
  totimp1 DOUBLE PRECISION,
  totimp2 DOUBLE PRECISION,
  totimp3 DOUBLE PRECISION,
  totimp4 DOUBLE PRECISION,
  descu DOUBLE PRECISION,
  act_inv TEXT,
  tip_cam DOUBLE PRECISION,
  uni_venta TEXT,
  tipo_elem TEXT,
  tipo_prod TEXT,
  cve_obs INTEGER,
  reg_serie INTEGER,
  e_ltpd INTEGER,
  factconv DOUBLE PRECISION,
  cost_dev DOUBLE PRECISION,
  num_alm INTEGER,
  mindirecto DOUBLE PRECISION,
  num_mov INTEGER,
  tot_partida DOUBLE PRECISION,
  man_ieps TEXT,
  apl_man_imp INTEGER,
  cuota_ieps DOUBLE PRECISION,
  apl_man_ieps TEXT,
  mto_porc DOUBLE PRECISION,
  mto_cuota DOUBLE PRECISION,
  cve_esq INTEGER,
  descr_art TEXT,
  imp8apla INTEGER,
  totimp8 DOUBLE PRECISION,
  totimp7 DOUBLE PRECISION,
  totimp6 DOUBLE PRECISION,
  totimp5 DOUBLE PRECISION,
  imp7apla INTEGER,
  imp6apla INTEGER,
  imp5apla INTEGER,
  impu8 DOUBLE PRECISION,
  impu7 DOUBLE PRECISION,
  impu6 DOUBLE PRECISION,
  impu5 DOUBLE PRECISION,
  preccimp DOUBLE PRECISION
);

ALTER TABLE par_compd05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_compd_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_compd_clib05 CASCADE;

CREATE TABLE par_compd_clib05 (
  clave_doc TEXT,
  num_part INTEGER
);

ALTER TABLE par_compd_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_compo05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_compo05 CASCADE;

CREATE TABLE par_compo05 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  cant DOUBLE PRECISION,
  pxr DOUBLE PRECISION,
  prec DOUBLE PRECISION,
  cost DOUBLE PRECISION,
  impu1 DOUBLE PRECISION,
  impu2 DOUBLE PRECISION,
  impu3 DOUBLE PRECISION,
  impu4 DOUBLE PRECISION,
  imp1apla INTEGER,
  imp2apla INTEGER,
  imp3apla INTEGER,
  imp4apla INTEGER,
  totimp1 DOUBLE PRECISION,
  totimp2 DOUBLE PRECISION,
  totimp3 DOUBLE PRECISION,
  totimp4 DOUBLE PRECISION,
  descu DOUBLE PRECISION,
  act_inv TEXT,
  tip_cam DOUBLE PRECISION,
  uni_venta TEXT,
  tipo_elem TEXT,
  tipo_prod TEXT,
  cve_obs INTEGER,
  e_ltpd INTEGER,
  reg_serie INTEGER,
  factconv DOUBLE PRECISION,
  cost_dev DOUBLE PRECISION,
  num_alm INTEGER,
  mindirecto DOUBLE PRECISION,
  num_mov INTEGER,
  tot_partida DOUBLE PRECISION,
  man_ieps TEXT,
  apl_man_imp INTEGER,
  cuota_ieps DOUBLE PRECISION,
  apl_man_ieps TEXT,
  mto_porc DOUBLE PRECISION,
  mto_cuota DOUBLE PRECISION,
  cve_esq INTEGER,
  descr_art TEXT,
  totimp6 DOUBLE PRECISION,
  totimp8 DOUBLE PRECISION,
  totimp7 DOUBLE PRECISION,
  totimp5 DOUBLE PRECISION,
  imp8apla INTEGER,
  imp7apla INTEGER,
  imp6apla INTEGER,
  imp5apla INTEGER,
  impu8 DOUBLE PRECISION,
  impu7 DOUBLE PRECISION,
  impu6 DOUBLE PRECISION,
  impu5 DOUBLE PRECISION,
  preccimp DOUBLE PRECISION
);

ALTER TABLE par_compo05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_compo_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_compo_clib05 CASCADE;

CREATE TABLE par_compo_clib05 (
  clave_doc TEXT,
  num_part INTEGER
);

ALTER TABLE par_compo_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_compq05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_compq05 CASCADE;

CREATE TABLE par_compq05 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  cant DOUBLE PRECISION,
  pxr DOUBLE PRECISION,
  prec DOUBLE PRECISION,
  cost DOUBLE PRECISION,
  impu1 DOUBLE PRECISION,
  impu2 DOUBLE PRECISION,
  impu3 DOUBLE PRECISION,
  impu4 DOUBLE PRECISION,
  imp1apla INTEGER,
  imp2apla INTEGER,
  imp3apla INTEGER,
  imp4apla INTEGER,
  totimp1 DOUBLE PRECISION,
  totimp2 DOUBLE PRECISION,
  totimp3 DOUBLE PRECISION,
  totimp4 DOUBLE PRECISION,
  descu DOUBLE PRECISION,
  act_inv TEXT,
  tip_cam DOUBLE PRECISION,
  uni_venta TEXT,
  tipo_elem TEXT,
  tipo_prod TEXT,
  cve_obs INTEGER,
  reg_serie INTEGER,
  e_ltpd INTEGER,
  factconv DOUBLE PRECISION,
  cost_dev DOUBLE PRECISION,
  num_alm INTEGER,
  mindirecto DOUBLE PRECISION,
  num_mov INTEGER,
  tot_partida DOUBLE PRECISION,
  man_ieps TEXT,
  apl_man_imp INTEGER,
  cuota_ieps DOUBLE PRECISION,
  apl_man_ieps TEXT,
  mto_porc DOUBLE PRECISION,
  mto_cuota DOUBLE PRECISION,
  cve_esq INTEGER,
  descr_art TEXT,
  imp5apla INTEGER,
  impu8 DOUBLE PRECISION,
  impu7 DOUBLE PRECISION,
  impu6 DOUBLE PRECISION,
  impu5 DOUBLE PRECISION,
  imp6apla INTEGER,
  imp7apla INTEGER,
  totimp8 DOUBLE PRECISION,
  totimp7 DOUBLE PRECISION,
  totimp6 DOUBLE PRECISION,
  totimp5 DOUBLE PRECISION,
  imp8apla INTEGER,
  preccimp DOUBLE PRECISION
);

ALTER TABLE par_compq05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_compq_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_compq_clib05 CASCADE;

CREATE TABLE par_compq_clib05 (
  clave_doc TEXT,
  num_part INTEGER
);

ALTER TABLE par_compq_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_compr05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_compr05 CASCADE;

CREATE TABLE par_compr05 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  cant DOUBLE PRECISION,
  pxr DOUBLE PRECISION,
  prec DOUBLE PRECISION,
  cost DOUBLE PRECISION,
  impu1 DOUBLE PRECISION,
  impu2 DOUBLE PRECISION,
  impu3 DOUBLE PRECISION,
  impu4 DOUBLE PRECISION,
  imp1apla INTEGER,
  imp2apla INTEGER,
  imp3apla INTEGER,
  imp4apla INTEGER,
  totimp1 DOUBLE PRECISION,
  totimp2 DOUBLE PRECISION,
  totimp3 DOUBLE PRECISION,
  totimp4 DOUBLE PRECISION,
  descu DOUBLE PRECISION,
  act_inv TEXT,
  tip_cam DOUBLE PRECISION,
  uni_venta TEXT,
  tipo_elem TEXT,
  tipo_prod TEXT,
  cve_obs INTEGER,
  reg_serie INTEGER,
  e_ltpd INTEGER,
  factconv DOUBLE PRECISION,
  cost_dev DOUBLE PRECISION,
  num_alm INTEGER,
  mindirecto DOUBLE PRECISION,
  num_mov INTEGER,
  tot_partida DOUBLE PRECISION,
  man_ieps TEXT,
  apl_man_imp INTEGER,
  cuota_ieps DOUBLE PRECISION,
  apl_man_ieps TEXT,
  mto_porc DOUBLE PRECISION,
  mto_cuota DOUBLE PRECISION,
  cve_esq INTEGER,
  descr_art TEXT,
  imp7apla INTEGER,
  imp6apla INTEGER,
  imp5apla INTEGER,
  impu8 DOUBLE PRECISION,
  impu7 DOUBLE PRECISION,
  impu6 DOUBLE PRECISION,
  impu5 DOUBLE PRECISION,
  imp8apla INTEGER,
  totimp5 DOUBLE PRECISION,
  totimp8 DOUBLE PRECISION,
  totimp7 DOUBLE PRECISION,
  totimp6 DOUBLE PRECISION,
  preccimp DOUBLE PRECISION
);

ALTER TABLE par_compr05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_compr_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_compr_clib05 CASCADE;

CREATE TABLE par_compr_clib05 (
  clave_doc TEXT,
  num_part INTEGER
);

ALTER TABLE par_compr_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_facta05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_facta05 CASCADE;

CREATE TABLE par_facta05 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  cant DOUBLE PRECISION,
  pxs DOUBLE PRECISION,
  prec DOUBLE PRECISION,
  cost DOUBLE PRECISION,
  impu1 DOUBLE PRECISION,
  impu2 DOUBLE PRECISION,
  impu3 DOUBLE PRECISION,
  impu4 DOUBLE PRECISION,
  imp1apla INTEGER,
  imp2apla INTEGER,
  imp3apla INTEGER,
  imp4apla INTEGER,
  totimp1 DOUBLE PRECISION,
  totimp2 DOUBLE PRECISION,
  totimp3 DOUBLE PRECISION,
  totimp4 DOUBLE PRECISION,
  desc1 DOUBLE PRECISION,
  desc2 DOUBLE PRECISION,
  desc3 DOUBLE PRECISION,
  comi DOUBLE PRECISION,
  apar DOUBLE PRECISION,
  act_inv TEXT,
  num_alm INTEGER,
  polit_apli TEXT,
  tip_cam DOUBLE PRECISION,
  uni_venta TEXT,
  tipo_prod TEXT,
  cve_obs INTEGER,
  reg_serie INTEGER,
  e_ltpd INTEGER,
  tipo_elem TEXT,
  num_mov INTEGER,
  tot_partida DOUBLE PRECISION,
  imprimir TEXT,
  man_ieps TEXT,
  apl_man_imp INTEGER,
  cuota_ieps DOUBLE PRECISION,
  apl_man_ieps TEXT,
  mto_porc DOUBLE PRECISION,
  mto_cuota DOUBLE PRECISION,
  cve_esq INTEGER,
  descr_art TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  id_relacion TEXT,
  prec_neto DOUBLE PRECISION,
  cve_unidad TEXT,
  cve_prodserv TEXT,
  impu8 DOUBLE PRECISION,
  totimp8 DOUBLE PRECISION,
  totimp7 DOUBLE PRECISION,
  totimp6 DOUBLE PRECISION,
  totimp5 DOUBLE PRECISION,
  imp8apla INTEGER,
  imp7apla INTEGER,
  imp6apla INTEGER,
  imp5apla INTEGER,
  impu7 DOUBLE PRECISION,
  impu6 DOUBLE PRECISION,
  impu5 DOUBLE PRECISION,
  preccimp DOUBLE PRECISION
);

ALTER TABLE par_facta05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_facta_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_facta_clib05 CASCADE;

CREATE TABLE par_facta_clib05 (
  clave_doc TEXT,
  num_part INTEGER
);

ALTER TABLE par_facta_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_factc05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_factc05 CASCADE;

CREATE TABLE par_factc05 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  cant DOUBLE PRECISION,
  pxs DOUBLE PRECISION,
  prec DOUBLE PRECISION,
  cost DOUBLE PRECISION,
  impu1 DOUBLE PRECISION,
  impu2 DOUBLE PRECISION,
  impu3 DOUBLE PRECISION,
  impu4 DOUBLE PRECISION,
  imp1apla INTEGER,
  imp2apla INTEGER,
  imp3apla INTEGER,
  imp4apla INTEGER,
  totimp1 DOUBLE PRECISION,
  totimp2 DOUBLE PRECISION,
  totimp3 DOUBLE PRECISION,
  totimp4 DOUBLE PRECISION,
  desc1 DOUBLE PRECISION,
  desc2 DOUBLE PRECISION,
  desc3 DOUBLE PRECISION,
  comi DOUBLE PRECISION,
  apar DOUBLE PRECISION,
  act_inv TEXT,
  num_alm INTEGER,
  polit_apli TEXT,
  tip_cam DOUBLE PRECISION,
  uni_venta TEXT,
  tipo_prod TEXT,
  cve_obs INTEGER,
  reg_serie INTEGER,
  e_ltpd INTEGER,
  tipo_elem TEXT,
  num_mov INTEGER,
  tot_partida DOUBLE PRECISION,
  imprimir TEXT,
  man_ieps TEXT,
  apl_man_imp INTEGER,
  cuota_ieps DOUBLE PRECISION,
  apl_man_ieps TEXT,
  mto_porc DOUBLE PRECISION,
  mto_cuota DOUBLE PRECISION,
  cve_esq INTEGER,
  descr_art TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  id_relacion TEXT,
  prec_neto DOUBLE PRECISION,
  cve_unidad TEXT,
  cve_prodserv TEXT,
  totimp8 DOUBLE PRECISION,
  totimp7 DOUBLE PRECISION,
  totimp6 DOUBLE PRECISION,
  totimp5 DOUBLE PRECISION,
  imp8apla INTEGER,
  imp7apla INTEGER,
  imp6apla INTEGER,
  imp5apla INTEGER,
  impu8 DOUBLE PRECISION,
  impu7 DOUBLE PRECISION,
  impu6 DOUBLE PRECISION,
  impu5 DOUBLE PRECISION,
  preccimp DOUBLE PRECISION
);

ALTER TABLE par_factc05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_factc_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_factc_clib05 CASCADE;

CREATE TABLE par_factc_clib05 (
  clave_doc TEXT,
  num_part INTEGER
);

ALTER TABLE par_factc_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_factd05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_factd05 CASCADE;

CREATE TABLE par_factd05 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  cant DOUBLE PRECISION,
  pxs DOUBLE PRECISION,
  prec DOUBLE PRECISION,
  cost DOUBLE PRECISION,
  impu1 DOUBLE PRECISION,
  impu2 DOUBLE PRECISION,
  impu3 DOUBLE PRECISION,
  impu4 DOUBLE PRECISION,
  imp1apla INTEGER,
  imp2apla INTEGER,
  imp3apla INTEGER,
  imp4apla INTEGER,
  totimp1 DOUBLE PRECISION,
  totimp2 DOUBLE PRECISION,
  totimp3 DOUBLE PRECISION,
  totimp4 DOUBLE PRECISION,
  desc1 DOUBLE PRECISION,
  desc2 DOUBLE PRECISION,
  desc3 DOUBLE PRECISION,
  comi DOUBLE PRECISION,
  apar DOUBLE PRECISION,
  act_inv TEXT,
  num_alm INTEGER,
  polit_apli TEXT,
  tip_cam DOUBLE PRECISION,
  uni_venta TEXT,
  tipo_prod TEXT,
  cve_obs INTEGER,
  reg_serie INTEGER,
  e_ltpd INTEGER,
  tipo_elem TEXT,
  num_mov INTEGER,
  tot_partida DOUBLE PRECISION,
  imprimir TEXT,
  man_ieps TEXT,
  apl_man_imp INTEGER,
  cuota_ieps DOUBLE PRECISION,
  apl_man_ieps TEXT,
  mto_porc DOUBLE PRECISION,
  mto_cuota DOUBLE PRECISION,
  cve_esq INTEGER,
  descr_art TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  prec_neto DOUBLE PRECISION,
  id_relacion TEXT,
  cve_unidad TEXT,
  cve_prodserv TEXT,
  imp6apla INTEGER,
  totimp8 DOUBLE PRECISION,
  totimp7 DOUBLE PRECISION,
  totimp6 DOUBLE PRECISION,
  totimp5 DOUBLE PRECISION,
  imp8apla INTEGER,
  imp7apla INTEGER,
  imp5apla INTEGER,
  impu8 DOUBLE PRECISION,
  impu7 DOUBLE PRECISION,
  impu6 DOUBLE PRECISION,
  impu5 DOUBLE PRECISION,
  preccimp DOUBLE PRECISION
);

ALTER TABLE par_factd05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_factd_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_factd_clib05 CASCADE;

CREATE TABLE par_factd_clib05 (
  clave_doc TEXT,
  num_part INTEGER
);

ALTER TABLE par_factd_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_facte05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_facte05 CASCADE;

CREATE TABLE par_facte05 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  cant DOUBLE PRECISION,
  pxs DOUBLE PRECISION,
  prec DOUBLE PRECISION,
  cost DOUBLE PRECISION,
  impu1 DOUBLE PRECISION,
  impu2 DOUBLE PRECISION,
  impu3 DOUBLE PRECISION,
  impu4 DOUBLE PRECISION,
  imp1apla INTEGER,
  imp2apla INTEGER,
  imp3apla INTEGER,
  imp4apla INTEGER,
  totimp1 DOUBLE PRECISION,
  totimp2 DOUBLE PRECISION,
  totimp3 DOUBLE PRECISION,
  totimp4 DOUBLE PRECISION,
  desc1 DOUBLE PRECISION,
  desc2 DOUBLE PRECISION,
  desc3 DOUBLE PRECISION,
  comi DOUBLE PRECISION,
  apar DOUBLE PRECISION,
  act_inv TEXT,
  num_alm INTEGER,
  polit_apli TEXT,
  tip_cam DOUBLE PRECISION,
  uni_venta TEXT,
  tipo_prod TEXT,
  cve_obs INTEGER,
  reg_serie INTEGER,
  e_ltpd INTEGER,
  tipo_elem TEXT,
  num_mov INTEGER,
  tot_partida DOUBLE PRECISION,
  imprimir TEXT,
  man_ieps TEXT,
  apl_man_imp INTEGER,
  cuota_ieps DOUBLE PRECISION,
  apl_man_ieps TEXT,
  mto_porc DOUBLE PRECISION,
  mto_cuota DOUBLE PRECISION,
  cve_esq INTEGER,
  descr_art TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  id_relacion TEXT,
  prec_neto DOUBLE PRECISION,
  cve_unidad TEXT,
  cve_prodserv TEXT,
  totimp8 DOUBLE PRECISION,
  impu6 DOUBLE PRECISION,
  totimp7 DOUBLE PRECISION,
  totimp6 DOUBLE PRECISION,
  totimp5 DOUBLE PRECISION,
  imp8apla INTEGER,
  imp7apla INTEGER,
  imp6apla INTEGER,
  imp5apla INTEGER,
  impu8 DOUBLE PRECISION,
  impu7 DOUBLE PRECISION,
  impu5 DOUBLE PRECISION,
  preccimp DOUBLE PRECISION
);

ALTER TABLE par_facte05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_facte_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_facte_clib05 CASCADE;

CREATE TABLE par_facte_clib05 (
  clave_doc TEXT,
  num_part INTEGER
);

ALTER TABLE par_facte_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_factf05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_factf05 CASCADE;

CREATE TABLE par_factf05 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  cant DOUBLE PRECISION,
  pxs DOUBLE PRECISION,
  prec DOUBLE PRECISION,
  cost DOUBLE PRECISION,
  impu1 DOUBLE PRECISION,
  impu2 DOUBLE PRECISION,
  impu3 DOUBLE PRECISION,
  impu4 DOUBLE PRECISION,
  imp1apla INTEGER,
  imp2apla INTEGER,
  imp3apla INTEGER,
  imp4apla INTEGER,
  totimp1 DOUBLE PRECISION,
  totimp2 DOUBLE PRECISION,
  totimp3 DOUBLE PRECISION,
  totimp4 DOUBLE PRECISION,
  desc1 DOUBLE PRECISION,
  desc2 DOUBLE PRECISION,
  desc3 DOUBLE PRECISION,
  comi DOUBLE PRECISION,
  apar DOUBLE PRECISION,
  act_inv TEXT,
  num_alm INTEGER,
  polit_apli TEXT,
  tip_cam DOUBLE PRECISION,
  uni_venta TEXT,
  tipo_prod TEXT,
  cve_obs INTEGER,
  reg_serie INTEGER,
  e_ltpd INTEGER,
  tipo_elem TEXT,
  num_mov INTEGER,
  tot_partida DOUBLE PRECISION,
  imprimir TEXT,
  man_ieps TEXT,
  apl_man_imp INTEGER,
  cuota_ieps DOUBLE PRECISION,
  apl_man_ieps TEXT,
  mto_porc DOUBLE PRECISION,
  mto_cuota DOUBLE PRECISION,
  cve_esq INTEGER,
  descr_art TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  id_relacion TEXT,
  prec_neto DOUBLE PRECISION,
  cve_unidad TEXT,
  cve_prodserv TEXT,
  impu6 DOUBLE PRECISION,
  impu5 DOUBLE PRECISION,
  impu7 DOUBLE PRECISION,
  impu8 DOUBLE PRECISION,
  totimp8 DOUBLE PRECISION,
  totimp7 DOUBLE PRECISION,
  totimp6 DOUBLE PRECISION,
  imp5apla INTEGER,
  imp6apla INTEGER,
  totimp5 DOUBLE PRECISION,
  imp7apla INTEGER,
  imp8apla INTEGER,
  preccimp DOUBLE PRECISION
);

ALTER TABLE par_factf05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_factf_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_factf_clib05 CASCADE;

CREATE TABLE par_factf_clib05 (
  clave_doc TEXT,
  num_part INTEGER
);

ALTER TABLE par_factf_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_factg05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_factg05 CASCADE;

CREATE TABLE par_factg05 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  cant DOUBLE PRECISION,
  pxs DOUBLE PRECISION,
  prec DOUBLE PRECISION,
  cost DOUBLE PRECISION,
  impu1 DOUBLE PRECISION,
  impu2 DOUBLE PRECISION,
  impu3 DOUBLE PRECISION,
  impu4 DOUBLE PRECISION,
  imp1apla INTEGER,
  imp2apla INTEGER,
  imp3apla INTEGER,
  imp4apla INTEGER,
  totimp1 DOUBLE PRECISION,
  totimp2 DOUBLE PRECISION,
  totimp3 DOUBLE PRECISION,
  totimp4 DOUBLE PRECISION,
  desc1 DOUBLE PRECISION,
  desc2 DOUBLE PRECISION,
  desc3 DOUBLE PRECISION,
  comi DOUBLE PRECISION,
  apar DOUBLE PRECISION,
  act_inv TEXT,
  num_alm INTEGER,
  polit_apli TEXT,
  tip_cam DOUBLE PRECISION,
  uni_venta TEXT,
  tipo_prod TEXT,
  cve_obs INTEGER,
  reg_serie INTEGER,
  e_ltpd INTEGER,
  tipo_elem TEXT,
  num_mov INTEGER,
  tot_partida DOUBLE PRECISION,
  imprimir TEXT,
  man_ieps TEXT,
  apl_man_imp INTEGER,
  cuota_ieps DOUBLE PRECISION,
  apl_man_ieps TEXT,
  mto_porc DOUBLE PRECISION,
  mto_cuota DOUBLE PRECISION,
  cve_esq INTEGER,
  descr_art TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  id_relacion TEXT,
  prec_neto DOUBLE PRECISION,
  cve_unidad TEXT,
  cve_prodserv TEXT,
  impu5 DOUBLE PRECISION,
  impu6 DOUBLE PRECISION,
  impu7 DOUBLE PRECISION,
  totimp8 DOUBLE PRECISION,
  totimp7 DOUBLE PRECISION,
  totimp6 DOUBLE PRECISION,
  totimp5 DOUBLE PRECISION,
  imp8apla INTEGER,
  imp7apla INTEGER,
  imp6apla INTEGER,
  imp5apla INTEGER,
  impu8 DOUBLE PRECISION,
  preccimp DOUBLE PRECISION
);

ALTER TABLE par_factg05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_factg_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_factg_clib05 CASCADE;

CREATE TABLE par_factg_clib05 (
  clave_doc TEXT,
  num_part INTEGER
);

ALTER TABLE par_factg_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_factp05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_factp05 CASCADE;

CREATE TABLE par_factp05 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  cant DOUBLE PRECISION,
  pxs DOUBLE PRECISION,
  prec DOUBLE PRECISION,
  cost DOUBLE PRECISION,
  impu1 DOUBLE PRECISION,
  impu2 DOUBLE PRECISION,
  impu3 DOUBLE PRECISION,
  impu4 DOUBLE PRECISION,
  imp1apla INTEGER,
  imp2apla INTEGER,
  imp3apla INTEGER,
  imp4apla INTEGER,
  totimp1 DOUBLE PRECISION,
  totimp2 DOUBLE PRECISION,
  totimp3 DOUBLE PRECISION,
  totimp4 DOUBLE PRECISION,
  desc1 DOUBLE PRECISION,
  desc2 DOUBLE PRECISION,
  desc3 DOUBLE PRECISION,
  comi DOUBLE PRECISION,
  apar DOUBLE PRECISION,
  act_inv TEXT,
  num_alm INTEGER,
  polit_apli TEXT,
  tip_cam DOUBLE PRECISION,
  uni_venta TEXT,
  tipo_prod TEXT,
  cve_obs INTEGER,
  reg_serie INTEGER,
  e_ltpd INTEGER,
  tipo_elem TEXT,
  num_mov INTEGER,
  tot_partida DOUBLE PRECISION,
  imprimir TEXT,
  man_ieps TEXT,
  apl_man_imp INTEGER,
  cuota_ieps DOUBLE PRECISION,
  apl_man_ieps TEXT,
  mto_porc DOUBLE PRECISION,
  mto_cuota DOUBLE PRECISION,
  cve_esq INTEGER,
  descr_art TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  prec_neto DOUBLE PRECISION,
  id_relacion TEXT,
  cve_prodserv TEXT,
  cve_unidad TEXT,
  imp5apla INTEGER,
  impu8 DOUBLE PRECISION,
  impu7 DOUBLE PRECISION,
  impu6 DOUBLE PRECISION,
  impu5 DOUBLE PRECISION,
  imp6apla INTEGER,
  imp7apla INTEGER,
  totimp8 DOUBLE PRECISION,
  totimp7 DOUBLE PRECISION,
  totimp6 DOUBLE PRECISION,
  totimp5 DOUBLE PRECISION,
  imp8apla INTEGER,
  preccimp DOUBLE PRECISION
);

ALTER TABLE par_factp05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_factp_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_factp_clib05 CASCADE;

CREATE TABLE par_factp_clib05 (
  clave_doc TEXT,
  num_part INTEGER
);

ALTER TABLE par_factp_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_factr05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_factr05 CASCADE;

CREATE TABLE par_factr05 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  cant DOUBLE PRECISION,
  pxs DOUBLE PRECISION,
  prec DOUBLE PRECISION,
  cost DOUBLE PRECISION,
  impu1 DOUBLE PRECISION,
  impu2 DOUBLE PRECISION,
  impu3 DOUBLE PRECISION,
  impu4 DOUBLE PRECISION,
  imp1apla INTEGER,
  imp2apla INTEGER,
  imp3apla INTEGER,
  imp4apla INTEGER,
  totimp1 DOUBLE PRECISION,
  totimp2 DOUBLE PRECISION,
  totimp3 DOUBLE PRECISION,
  totimp4 DOUBLE PRECISION,
  desc1 DOUBLE PRECISION,
  desc2 DOUBLE PRECISION,
  desc3 DOUBLE PRECISION,
  comi DOUBLE PRECISION,
  apar DOUBLE PRECISION,
  act_inv TEXT,
  num_alm INTEGER,
  polit_apli TEXT,
  tip_cam DOUBLE PRECISION,
  uni_venta TEXT,
  tipo_prod TEXT,
  cve_obs INTEGER,
  reg_serie INTEGER,
  e_ltpd INTEGER,
  tipo_elem TEXT,
  num_mov INTEGER,
  tot_partida DOUBLE PRECISION,
  imprimir TEXT,
  man_ieps TEXT,
  apl_man_imp INTEGER,
  cuota_ieps DOUBLE PRECISION,
  apl_man_ieps TEXT,
  mto_porc DOUBLE PRECISION,
  mto_cuota DOUBLE PRECISION,
  cve_esq INTEGER,
  descr_art TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  id_relacion TEXT,
  prec_neto DOUBLE PRECISION,
  cve_prodserv TEXT,
  cve_unidad TEXT,
  imp8apla INTEGER,
  totimp8 DOUBLE PRECISION,
  totimp7 DOUBLE PRECISION,
  totimp6 DOUBLE PRECISION,
  totimp5 DOUBLE PRECISION,
  imp7apla INTEGER,
  imp6apla INTEGER,
  imp5apla INTEGER,
  impu8 DOUBLE PRECISION,
  impu7 DOUBLE PRECISION,
  impu6 DOUBLE PRECISION,
  impu5 DOUBLE PRECISION,
  preccimp DOUBLE PRECISION
);

ALTER TABLE par_factr05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_factr_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_factr_clib05 CASCADE;

CREATE TABLE par_factr_clib05 (
  clave_doc TEXT,
  num_part INTEGER
);

ALTER TABLE par_factr_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_factt05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_factt05 CASCADE;

CREATE TABLE par_factt05 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  cant DOUBLE PRECISION,
  pxs DOUBLE PRECISION,
  prec DOUBLE PRECISION,
  cost DOUBLE PRECISION,
  impu1 DOUBLE PRECISION,
  impu2 DOUBLE PRECISION,
  impu3 DOUBLE PRECISION,
  impu4 DOUBLE PRECISION,
  imp1apla INTEGER,
  imp2apla INTEGER,
  imp3apla INTEGER,
  imp4apla INTEGER,
  totimp1 DOUBLE PRECISION,
  totimp2 DOUBLE PRECISION,
  totimp3 DOUBLE PRECISION,
  totimp4 DOUBLE PRECISION,
  desc1 DOUBLE PRECISION,
  desc2 DOUBLE PRECISION,
  desc3 DOUBLE PRECISION,
  comi DOUBLE PRECISION,
  apar DOUBLE PRECISION,
  act_inv TEXT,
  num_alm INTEGER,
  polit_apli TEXT,
  tip_cam DOUBLE PRECISION,
  uni_venta TEXT,
  tipo_prod TEXT,
  cve_obs INTEGER,
  reg_serie INTEGER,
  e_ltpd INTEGER,
  tipo_elem TEXT,
  num_mov INTEGER,
  tot_partida DOUBLE PRECISION,
  imprimir TEXT,
  man_ieps TEXT,
  apl_man_imp INTEGER,
  cuota_ieps DOUBLE PRECISION,
  apl_man_ieps TEXT,
  mto_porc DOUBLE PRECISION,
  mto_cuota DOUBLE PRECISION,
  cve_esq INTEGER,
  descr_art TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  prec_neto DOUBLE PRECISION,
  id_relacion TEXT,
  cve_unidad TEXT,
  cve_prodserv TEXT,
  totimp8 DOUBLE PRECISION,
  totimp7 DOUBLE PRECISION,
  totimp6 DOUBLE PRECISION,
  totimp5 DOUBLE PRECISION,
  imp8apla INTEGER,
  imp7apla INTEGER,
  imp6apla INTEGER,
  imp5apla INTEGER,
  impu8 DOUBLE PRECISION,
  impu7 DOUBLE PRECISION,
  impu6 DOUBLE PRECISION,
  impu5 DOUBLE PRECISION,
  preccimp DOUBLE PRECISION
);

ALTER TABLE par_factt05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_factt_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_factt_clib05 CASCADE;

CREATE TABLE par_factt_clib05 (
  clave_doc TEXT,
  num_part INTEGER
);

ALTER TABLE par_factt_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_factv05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_factv05 CASCADE;

CREATE TABLE par_factv05 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  cant DOUBLE PRECISION,
  pxs DOUBLE PRECISION,
  prec DOUBLE PRECISION,
  cost DOUBLE PRECISION,
  impu1 DOUBLE PRECISION,
  impu2 DOUBLE PRECISION,
  impu3 DOUBLE PRECISION,
  impu4 DOUBLE PRECISION,
  imp1apla INTEGER,
  imp2apla INTEGER,
  imp3apla INTEGER,
  imp4apla INTEGER,
  totimp1 DOUBLE PRECISION,
  totimp2 DOUBLE PRECISION,
  totimp3 DOUBLE PRECISION,
  totimp4 DOUBLE PRECISION,
  desc1 DOUBLE PRECISION,
  desc2 DOUBLE PRECISION,
  desc3 DOUBLE PRECISION,
  comi DOUBLE PRECISION,
  apar DOUBLE PRECISION,
  act_inv TEXT,
  num_alm INTEGER,
  polit_apli TEXT,
  tip_cam DOUBLE PRECISION,
  uni_venta TEXT,
  tipo_prod TEXT,
  cve_obs INTEGER,
  reg_serie INTEGER,
  e_ltpd INTEGER,
  tipo_elem TEXT,
  num_mov INTEGER,
  tot_partida DOUBLE PRECISION,
  imprimir TEXT,
  man_ieps TEXT,
  apl_man_imp INTEGER,
  cuota_ieps DOUBLE PRECISION,
  apl_man_ieps TEXT,
  mto_porc DOUBLE PRECISION,
  mto_cuota DOUBLE PRECISION,
  cve_esq INTEGER,
  descr_art TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  id_relacion TEXT,
  prec_neto DOUBLE PRECISION,
  cve_prodserv TEXT,
  cve_unidad TEXT,
  totimp8 DOUBLE PRECISION,
  totimp7 DOUBLE PRECISION,
  totimp6 DOUBLE PRECISION,
  totimp5 DOUBLE PRECISION,
  imp8apla INTEGER,
  imp6apla INTEGER,
  imp5apla INTEGER,
  impu8 DOUBLE PRECISION,
  impu7 DOUBLE PRECISION,
  impu6 DOUBLE PRECISION,
  impu5 DOUBLE PRECISION,
  imp7apla INTEGER,
  preccimp DOUBLE PRECISION
);

ALTER TABLE par_factv05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_factv_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_factv_clib05 CASCADE;

CREATE TABLE par_factv_clib05 (
  clave_doc TEXT,
  num_part INTEGER
);

ALTER TABLE par_factv_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_ped_amazon05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_ped_amazon05 CASCADE;

CREATE TABLE par_ped_amazon05 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_par TEXT,
  asin TEXT,
  sku_am TEXT,
  titulo TEXT,
  cant INTEGER,
  cant_enviada INTEGER,
  prec DOUBLE PRECISION,
  cve_moned TEXT,
  cve_moned_env TEXT,
  cost_envio DOUBLE PRECISION,
  es_regalo TEXT,
  msg_regalo TEXT,
  cve_moned_rega TEXT,
  cost_regalo DOUBLE PRECISION,
  tipo_envoltura TEXT,
  cve_moned_descu TEXT,
  descuento DOUBLE PRECISION,
  tot_partida DOUBLE PRECISION
);

ALTER TABLE par_ped_amazon05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_ped_claro05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_ped_claro05 CASCADE;

CREATE TABLE par_ped_claro05 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  claro_id TEXT,
  titulo_art TEXT,
  asignado TEXT,
  id_ped_rel TEXT,
  importe DOUBLE PRECISION,
  cst_envio DOUBLE PRECISION,
  f_asigna TIMESTAMPTZ,
  f_envio TIMESTAMPTZ
);

ALTER TABLE par_ped_claro05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_ped_tiend05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_ped_tiend05 CASCADE;

CREATE TABLE par_ped_tiend05 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  cve_sae TEXT,
  titulo TEXT,
  categoria TEXT,
  condicion TEXT,
  cant DOUBLE PRECISION,
  prec DOUBLE PRECISION,
  cve_moned TEXT,
  tot_partida DOUBLE PRECISION
);

ALTER TABLE par_ped_tiend05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: ped_amazon05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS ped_amazon05 CASCADE;

CREATE TABLE ped_amazon05 (
  tipo_doc TEXT,
  cve_doc TEXT,
  tip_doc_sig TEXT,
  doc_sig TEXT,
  status TEXT,
  moned TEXT,
  importe DOUBLE PRECISION,
  estado_sinc TEXT,
  f_compra TIMESTAMPTZ,
  tip_doc_e TEXT,
  cve_bita INTEGER,
  f_modificacion TIMESTAMPTZ,
  met_pago TEXT,
  detmet_pago TEXT,
  cumpli TEXT,
  nom_comp TEXT,
  calle_comp TEXT,
  entre_comp TEXT,
  ycalle_comp TEXT,
  cd_comp TEXT,
  mun_comp TEXT,
  pais_comp TEXT,
  dis_comp TEXT,
  edo_comp TEXT,
  cp_comp TEXT,
  bloq TEXT,
  enlazado TEXT
);

ALTER TABLE ped_amazon05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: ped_claro05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS ped_claro05 CASCADE;

CREATE TABLE ped_claro05 (
  tipo_doc TEXT,
  cve_doc TEXT,
  doc_sig TEXT,
  cve_clie TEXT,
  nom_comp TEXT,
  dire_comp TEXT,
  calle_comp TEXT,
  col_comp TEXT,
  cp_comp TEXT,
  cd_comp TEXT,
  edo_comp TEXT,
  muni_comp TEXT,
  edo_ped TEXT,
  f_coloca TIMESTAMPTZ,
  f_autoriza TIMESTAMPTZ,
  sku TEXT,
  f_embar TIMESTAMPTZ,
  num_guia TEXT,
  paquet TEXT,
  cant_prod DOUBLE PRECISION,
  cant_prod_ped DOUBLE PRECISION,
  tip_doc_e TEXT,
  cve_bita INTEGER,
  bloq TEXT,
  tip_doc_sig TEXT,
  estado_sinc TEXT,
  f_entrega TIMESTAMPTZ,
  obs_envio TEXT,
  importe DOUBLE PRECISION,
  enlazado TEXT,
  status TEXT
);

ALTER TABLE ped_claro05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: ped_tiend05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS ped_tiend05 CASCADE;

CREATE TABLE ped_tiend05 (
  tipo_doc TEXT,
  cve_doc TEXT,
  doc_sig TEXT,
  cve_tienda TEXT,
  cve_clie TEXT,
  estado TEXT,
  status TEXT,
  cve_vend TEXT,
  f_elab TIMESTAMPTZ,
  f_confir TIMESTAMPTZ,
  f_vigen TIMESTAMPTZ,
  f_last_update TIMESTAMPTZ,
  importe DOUBLE PRECISION,
  enlazado TEXT,
  tip_doc_e TEXT,
  cve_moned TEXT,
  tipcamb DOUBLE PRECISION,
  cve_bita INTEGER,
  bloq TEXT,
  tip_doc_sig TEXT,
  status_sae TEXT,
  estado_sinc TEXT,
  mod_envio TEXT,
  nick_name TEXT,
  correo TEXT,
  nombre_comp TEXT,
  apellido_comp TEXT,
  f_entrega TIMESTAMPTZ,
  cost_envio DOUBLE PRECISION,
  subtot DOUBLE PRECISION,
  comi_venta DOUBLE PRECISION,
  num_guia TEXT,
  entregado TEXT,
  obs_envio TEXT,
  cve_envio TEXT,
  tip_doc_seg TEXT,
  doc_seg TEXT,
  cve_info INTEGER,
  opcion_envio TEXT,
  pack_id TEXT
);

ALTER TABLE ped_tiend05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: periodos05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS periodos05 CASCADE;

CREATE TABLE periodos05 (
  cve_per INTEGER,
  tipo TEXT,
  fechaini TIMESTAMPTZ,
  fechafin TIMESTAMPTZ,
  descripcion TEXT
);

ALTER TABLE periodos05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: poli05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS poli05 CASCADE;

CREATE TABLE poli05 (
  cve_polit INTEGER,
  descr TEXT,
  st TEXT,
  cve_ini TEXT,
  cve_fin TEXT,
  lin_prod TEXT,
  vol_min DOUBLE PRECISION,
  clie_d TEXT,
  clie_h TEXT,
  clas_clie TEXT,
  v_dfech TIMESTAMPTZ,
  v_hfech TIMESTAMPTZ,
  t_pol TEXT,
  prc_mon TEXT,
  lista_prec INTEGER,
  val DOUBLE PRECISION,
  limunivta DOUBLE PRECISION,
  numuniven DOUBLE PRECISION,
  cve_zona TEXT,
  cve_alm INTEGER,
  debajo_min TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ
);

ALTER TABLE poli05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: precios05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS precios05 CASCADE;

CREATE TABLE precios05 (
  cve_precio INTEGER,
  descripcion TEXT,
  cve_bita INTEGER,
  status TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  con_impu TEXT
);

ALTER TABLE precios05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: precio_x_prod05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS precio_x_prod05 CASCADE;

CREATE TABLE precio_x_prod05 (
  cve_art TEXT,
  cve_precio INTEGER,
  precio DOUBLE PRECISION,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  preciocimp DOUBLE PRECISION
);

ALTER TABLE precio_x_prod05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: prodsust05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS prodsust05 CASCADE;

CREATE TABLE prodsust05 (
  cve_art TEXT,
  cve_lista INTEGER
);

ALTER TABLE prodsust05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: prod_x_conc05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS prod_x_conc05 CASCADE;

CREATE TABLE prod_x_conc05 (
  cve_art TEXT,
  uuid TEXT,
  descripcion TEXT,
  noidentificacion TEXT
);

ALTER TABLE prod_x_conc05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: prov05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS prov05 CASCADE;

CREATE TABLE prov05 (
  clave TEXT,
  status TEXT,
  nombre TEXT,
  rfc TEXT,
  calle TEXT,
  numint TEXT,
  numext TEXT,
  cruzamientos TEXT,
  cruzamientos2 TEXT,
  colonia TEXT,
  codigo TEXT,
  localidad TEXT,
  municipio TEXT,
  estado TEXT,
  cve_pais TEXT,
  nacionalidad TEXT,
  telefono TEXT,
  clasific TEXT,
  fax TEXT,
  pag_web TEXT,
  curp TEXT,
  cve_zona TEXT,
  con_credito TEXT,
  diascred INTEGER,
  limcred DOUBLE PRECISION,
  cve_bita INTEGER,
  ult_pagod TEXT,
  ult_pagom DOUBLE PRECISION,
  ult_pagof TIMESTAMPTZ,
  ult_compd TEXT,
  ult_compm DOUBLE PRECISION,
  ult_compf TIMESTAMPTZ,
  saldo DOUBLE PRECISION,
  ventas DOUBLE PRECISION,
  descuento DOUBLE PRECISION,
  tip_tercero INTEGER,
  tip_opera INTEGER,
  cve_obs INTEGER,
  cuenta_contable TEXT,
  forma_pago INTEGER,
  beneficiario TEXT,
  titular_cuenta TEXT,
  banco TEXT,
  sucursal_banco TEXT,
  cuenta_banco TEXT,
  clabe TEXT,
  desc_otros TEXT,
  imprir TEXT,
  mail TEXT,
  nivelsec INTEGER,
  enviosilen TEXT,
  emailpred TEXT,
  modelo TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  val_rfc INTEGER,
  reg_fisc TEXT,
  uuid TEXT,
  coi_sinc TIMESTAMPTZ,
  cuenta_contable2 TEXT,
  status_rfc_ln TEXT,
  id_fiscal TEXT
);

ALTER TABLE prov05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: prov_clib05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS prov_clib05 CASCADE;

CREATE TABLE prov_clib05 (
  cve_prov TEXT,
  camplib1 TEXT,
  camplib2 TEXT,
  camplib3 TEXT,
  camplib4 INTEGER,
  camplib5 DOUBLE PRECISION,
  camplib6 DOUBLE PRECISION
);

ALTER TABLE prov_clib05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: prvprod05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS prvprod05 CASCADE;

CREATE TABLE prvprod05 (
  cve_art TEXT,
  cve_prov TEXT,
  costo DOUBLE PRECISION,
  t_entrega INTEGER
);

ALTER TABLE prvprod05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: resact05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS resact05 CASCADE;

CREATE TABLE resact05 (
  cve_campania TEXT,
  cve_actividad TEXT,
  cve_resultado TEXT,
  orden INTEGER,
  cve_actsig TEXT,
  duracion INTEGER,
  finaliza TEXT,
  genera_bita TEXT
);

ALTER TABLE resact05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: result05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS result05 CASCADE;

CREATE TABLE result05 (
  cve_resultado TEXT,
  descr TEXT,
  status TEXT
);

ALTER TABLE result05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: sucursales05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS sucursales05 CASCADE;

CREATE TABLE sucursales05 (
  cve_sucursal INTEGER,
  nombre TEXT,
  direccion TEXT,
  telefono TEXT,
  encargado TEXT,
  status TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION
);

ALTER TABLE sucursales05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: suc_almacen05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS suc_almacen05 CASCADE;

CREATE TABLE suc_almacen05 (
  cve_sucursal INTEGER,
  cve_almacen INTEGER
);

ALTER TABLE suc_almacen05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: suc_series05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS suc_series05 CASCADE;

CREATE TABLE suc_series05 (
  cve_sucursal INTEGER,
  tip_doc TEXT,
  cve_folio TEXT
);

ALTER TABLE suc_series05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: suc_usuario05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS suc_usuario05 CASCADE;

CREATE TABLE suc_usuario05 (
  cve_sucursal INTEGER,
  cve_usuario INTEGER
);

ALTER TABLE suc_usuario05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: talla05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS talla05 CASCADE;

CREATE TABLE talla05 (
  cve_lin TEXT,
  valor TEXT,
  descrip TEXT
);

ALTER TABLE talla05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: tblcontrol05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS tblcontrol05 CASCADE;

CREATE TABLE tblcontrol05 (
  id_tabla INTEGER,
  ult_cve INTEGER
);

ALTER TABLE tblcontrol05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: tipo_terceros05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS tipo_terceros05 CASCADE;

CREATE TABLE tipo_terceros05 (
  tipo INTEGER,
  descr TEXT
);

ALTER TABLE tipo_terceros05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: vend05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS vend05 CASCADE;

CREATE TABLE vend05 (
  cve_vend TEXT,
  status TEXT,
  nombre TEXT,
  comi DOUBLE PRECISION,
  clasific TEXT,
  correoe TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ
);

ALTER TABLE vend05 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: zona05
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS zona05 CASCADE;

CREATE TABLE zona05 (
  cve_zona TEXT,
  cve_padre TEXT,
  texto TEXT,
  tnodo TEXT,
  cta_cont TEXT,
  impueflete DOUBLE PRECISION,
  montoflete DOUBLE PRECISION,
  formula TEXT,
  status TEXT
);

ALTER TABLE zona05 DISABLE ROW LEVEL SECURITY;

