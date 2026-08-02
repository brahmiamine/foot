import React from "react"
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
  Input
} from "reactstrap"

import Breadcrumbs from "../../components/Common/Breadcrumb"

// Form Mask
import { IMaskInput } from "react-imask"

const FormMask = () => {
  //meta title
  document.title = "Form Mask | Skote - Vite React Admin & Dashboard Template"

  const Repeat = props => (
    <IMaskInput
      mask="0000000000"
      value={props.value}
      className="form-control input-color"
      onAccept={(value) => props.onChange?.({ target: { value } })}
    />
  )


  const IPV4 = props => (
    <IMaskInput
      mask="000.000.000.000"
      value={props.value}
      className="form-control input-color"
      onAccept={(value) => props.onChange?.({ target: { value } })}
    />
  )
  const TAX = props => (
    <IMaskInput
      mask="00-0000000"
      value={props.value}
      className="form-control input-color"
      onAccept={(value) => props.onChange?.({ target: { value } })}
    />
  )

  const Phone = props => (
    <IMaskInput
      mask="(000) 000-0000"
      value={props.value}
      className="form-control input-color"
      onAccept={(value) => props.onChange?.({ target: { value } })}
    />
  )

  const Currency = props => (
    <IMaskInput
      mask={Number}
      scale={2}
      thousandsSeparator=","
      radix="."
      mapToRadix={['.']}
      value={props.value}
      className="form-control input-color"
      onAccept={(value) => props.onChange?.({ target: { value: value || '' } })}
      unmask={true}
      min={0}
    />
  )

  const Date1 = props => (
    <IMaskInput
      mask="00/00/0000"
      value={props.value}
      className="form-control input-color"
      onAccept={(value) => props.onChange?.({ target: { value } })}
    />
  )

  const Date2 = props => (
    <IMaskInput
      mask="00-00-0000"
      value={props.value}
      className="form-control input-color"
      onAccept={(value) => props.onChange?.({ target: { value } })}
    />
  )

  const Date3 = props => (
    <IMaskInput
      mask="0000-00-00 00:00:00"
      value={props.value}
      className="form-control input-color"
      onAccept={(value) => props.onChange?.({ target: { value } })}
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
                            <Label for="input-email">Email address:</Label>
                            <Phone />
                            <span className="text-muted">_@_._</span>
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
