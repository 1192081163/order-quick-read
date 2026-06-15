import email_order_reader


def test_package_has_version():
    assert isinstance(email_order_reader.__version__, str)
    assert email_order_reader.__version__
