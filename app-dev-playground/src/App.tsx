import { useState } from 'react'
import { ConfigProvider, Layout, Menu, theme } from 'antd'
import { ShoppingOutlined, PlusOutlined, EditOutlined } from '@ant-design/icons'
import ProductGuide from './guides/ProductGuide'
import ProductCreateGuide from './guides/ProductCreateGuide'
import ProductUpdateGuide from './guides/ProductUpdateGuide'

const { Sider, Content } = Layout

const menuItems = [
  {
    key: 'product',
    icon: <ShoppingOutlined />,
    label: 'Product List',
  },
  {
    key: 'product-create',
    icon: <PlusOutlined />,
    label: 'Product Create',
  },
  {
    key: 'product-update',
    icon: <EditOutlined />,
    label: 'Product Update',
  },
]

type GuideKey = 'product' | 'product-create' | 'product-update'

const guides: Record<GuideKey, React.ComponentType> = {
  product: ProductGuide,
  'product-create': ProductCreateGuide,
  'product-update': ProductUpdateGuide,
}

export default function App() {
  const [selected, setSelected] = useState<GuideKey>('product')
  const GuideComponent = guides[selected]

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          borderRadius: 6,
          colorPrimary: '#1677ff',
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Sider width={200} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
          <div style={{ padding: '16px', fontWeight: 'bold', fontSize: 16, textAlign: 'center' }}>
            Playground
          </div>
          <Menu
            mode="inline"
            selectedKeys={[selected]}
            items={menuItems}
            onSelect={({ key }) => setSelected(key as GuideKey)}
          />
        </Sider>
        <Content style={{ padding: 24, background: '#f5f5f5' }}>
          <GuideComponent />
        </Content>
      </Layout>
    </ConfigProvider>
  )
}
