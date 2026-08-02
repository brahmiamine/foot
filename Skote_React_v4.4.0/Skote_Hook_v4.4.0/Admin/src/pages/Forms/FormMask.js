import React, { useState } from "react"
import PropTypes from "prop-types"
import {
  Row,
  Col,
  Form,
  Label,
  Card,
  CardBody,
  CardTitle,
  Container,
} from "reactstrap"

import Breadcrumbs from "../../components/Common/Breadcrumb"

// Form Mask
import { IMaskInput } from "react-imask"

const FormMask = () => {
  //meta title
  document.title = "Form Mask | Skote - React Admin & Dashboard Template"

  const [repeatValue, setRepeatValue] = useState("")
  const [ipv4Value, setIpv4Value] = useState("")
  const [taxValue, setTaxValue] = useState("")
  const [phoneValue, setPhoneValue] = useState("")
  const [currencyValue, setCurrencyValue] = useState("")
  const [date1Value, setDate1Value] = useState("")
  const [date2Value, setDate2Value] = useState("")
  const [date3Value, setDate3Value] = useState("")

  const Repeat = () => (
    <IMaskInput
      mask="0000000000"
      value={repeatValue}
      onAccept={(value) => setRepeatValue(value)}
      className="form-control input-color"
    />
  )

  const IPV4 = () => (
    <IMaskInput
      mask="000.000.000.000"
      value={ipv4Value}
      onAccept={(value) => setIpv4Value(value)}
      className="form-control input-color"
    />
  )

  const TAX = () => (
    <IMaskInput
      mask="00-0000000"
      value={taxValue}
      onAccept={(value) => setTaxValue(value)}
      className="form-control input-color"
    />
  )

  const Phone = () => (
    <IMaskInput
      mask="(000) 000-0000"
      value={phoneValue}
      onAccept={(value) => setPhoneValue(value)}
      className="form-control input-color"
    />
  )

  const Currency = () => (
    <IMaskInput
      mask={Number}
      scale={2}
      thousandsSeparator=","
      padFractionalZeros
      normalizeZeros
      radix="."
      mapToRadix={["."]}
      value={currencyValue}
      onAccept={(value) => setCurrencyValue(value)}
      className="form-control input-color"
    />
  )

  const Date1 = () => (
    <IMaskInput
      mask="00/00/0000"
      value={date1Value}
      onAccept={(value) => setDate1Value(value)}
      className="form-control input-color"
    />
  )

  const Date2 = () => (
    <IMaskInput
      mask="00-00-0000"
      value={date2Value}
      onAccept={(value) => setDate2Value(value)}
      className="form-control input-color"
    />
  )

  const Date3 = () => (
    <IMaskInput
      mask="0000-00-00 00:00:00"
      value={date3Value}
      onAccept={(value) => setDate3Value(value)}
      className="form-control input-color"
    />
  )

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid={true}>
          <Breadcrumbs title="Forms" breadcrumbItem="Form Mask" />

          <Row>
            <Col lg={12}>
              <Card>
                <CardBody>
                  <CardTitle className="mb-4">Example</CardTitle>
                  <Form>
                    <Row>
                      <Col lg={6}>
                        <div>
                          <div className="form-group mb-4">
                            <Label for="input-date1">Date Style 1</Label>
                            <Date1 />
                            <span className="text-muted">e.g "dd/mm/yyyy"</span>
                          </div>
                          <div className="form-group mb-4">
                            <Label for="input-date2">Date Style 2</Label>
                            <Date2 />
                            <span className="text-muted">e.g "mm/dd/yyyy"</span>
                          </div>
                          <div className="form-group mb-4">
                            <Label for="input-datetime">Date time</Label>
                            <Date3 />
                            <span className="text-muted">e.g "yyyy-mm-dd'T'HH:MM:ss"</span>
                          </div>
                          <div className="form-group mb-0">
                            <Label for="input-currency">Currency:</Label>
                            <Currency />
                            <span className="text-muted">e.g "$ 0.00"</span>
                          </div>
                        </div>
                      </Col>
                      <Col lg={6}>
                        <div className="mt-4 mt-lg-0">
                          <div className="form-group mb-4">
                            <Label for="input-repeat">repeat:</Label>
                            <Repeat />
                            <span className="text-muted">e.g "9999999999"</span>
                          </div>
                          <div className="form-group mb-4">
                            <Label for="input-mask">Mask</Label>
                            <TAX />
                            <span className="text-muted">e.g "99-9999999"</span>
                          </div>
                          <div className="form-group mb-4">
                            <Label for="input-ip">IP address</Label>
                            <IPV4 />
                            <span className="text-muted">e.g "99.99.99.99"</span>

                          </div>
                          <div className="form-group mb-0">
                            <Label for="input-phone">Phone:</Label>
                            <Phone />
                            <span className="text-muted">(999) 999-9999</span>
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </Form>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    </React.Fragment>
  )
}

FormMask.propTypes = {
  value: PropTypes.any,
  onChange: PropTypes.func,
}

export default FormMask
